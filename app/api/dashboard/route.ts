import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const activeMembershipStatuses = ['active', 'pending']
const pendingPayoutStatuses = ['scheduled', 'eligibility_review', 'approved', 'processing', 'held']

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const userId = authData.user.id

    const [
      walletResult,
      membershipResult,
      payoutResult,
      activityResult,
    ] = await Promise.all([
      supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', userId)
        .maybeSingle(),

      supabase
        .from('group_members')
        .select('id, status, joined_at, groups(id, name, status)')
        .eq('user_id', userId)
        .in('status', activeMembershipStatuses),

      supabase
        .from('payouts')
        .select('id, group_id, period_number, scheduled_date, expected_amount, status, paid_at, groups(name)')
        .eq('group_member_id', userId)
        .in('status', pendingPayoutStatuses),

      supabase
        .from('ledger_transactions')
        .select('id, type, status, amount, currency, description, created_at, group_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    if (walletResult.error) throw walletResult.error
    if (membershipResult.error) throw membershipResult.error
    if (payoutResult.error) throw payoutResult.error
    if (activityResult.error) throw activityResult.error

    const memberships = membershipResult.data ?? []
    const payouts = payoutResult.data ?? []
    const activities = activityResult.data ?? []

    // The payouts table is keyed by group_member_id, not user_id. Resolve the
    // user's membership IDs before querying pending payouts.
    let resolvedPayouts = payouts
    if (!payouts.length && memberships.length) {
      const membershipIds = memberships.map((membership) => membership.id)
      const { data, error } = await supabase
        .from('payouts')
        .select('id, group_id, period_number, scheduled_date, expected_amount, status, paid_at, groups(name)')
        .in('group_member_id', membershipIds)
        .in('status', pendingPayoutStatuses)
        .order('scheduled_date', { ascending: true })

      if (error) throw error
      resolvedPayouts = data ?? []
    }

    const { data: paidPayouts, error: paidPayoutError } = await supabase
      .from('payouts')
      .select('expected_amount')
      .in('group_member_id', memberships.map((membership) => membership.id).length ? memberships.map((membership) => membership.id) : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'paid')

    if (paidPayoutError) throw paidPayoutError

    const totalPayouts = (paidPayouts ?? []).reduce(
      (sum, payout) => sum + Number(payout.expected_amount ?? 0),
      0,
    )

    return NextResponse.json({
      authenticated: true,
      wallet: {
        balance: Number(walletResult.data?.balance ?? 0),
        currency: walletResult.data?.currency ?? 'NGN',
      },
      activeGroups: memberships.length,
      totalPayouts,
      pendingPayouts: resolvedPayouts.reduce(
        (sum, payout) => sum + Number(payout.expected_amount ?? 0),
        0,
      ),
      groups: memberships.map((membership) => {
        const group = Array.isArray(membership.groups) ? membership.groups[0] : membership.groups
        return {
          id: group?.id ?? membership.id,
          name: group?.name ?? 'Savings Group',
          status: group?.status ?? membership.status,
          joinedAt: membership.joined_at,
        }
      }),
      payouts: resolvedPayouts.map((payout) => {
        const group = Array.isArray(payout.groups) ? payout.groups[0] : payout.groups
        return {
          id: payout.id,
          groupName: group?.name ?? 'Savings Group',
          periodNumber: payout.period_number,
          scheduledDate: payout.scheduled_date,
          expectedAmount: Number(payout.expected_amount ?? 0),
          status: payout.status,
          paidAt: payout.paid_at,
        }
      }),
      activity: activities.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        status: transaction.status,
        amount: Number(transaction.amount ?? 0),
        currency: transaction.currency ?? 'NGN',
        description: transaction.description ?? transaction.type,
        createdAt: transaction.created_at,
      })),
    })
  } catch (error) {
    console.error('Dashboard data error:', error)
    return NextResponse.json(
      { authenticated: true, error: 'Unable to load dashboard data' },
      { status: 500 },
    )
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const admin = createAdminClient()
    const { data: group, error } = await admin
      .from('groups')
      .select('id,name,description,cycle,contribution_amount,slot_count,start_date,close_date,finish_date,status,approval_status,is_private')
      .eq('invite_token', token)
      .eq('is_private', true)
      .eq('approval_status', 'approved')
      .in('status', ['open','full'])
      .maybeSingle()
    if (error || !group) return NextResponse.json({ error: 'Private group link is invalid or no longer available.' }, { status: 404 })
    return NextResponse.json({ group })
  } catch {
    return NextResponse.json({ error: 'Unable to load private group.' }, { status: 500 })
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Log in or create a ZeePay account before joining this private group.' }, { status: 401 })
    const { data, error } = await supabase.rpc('join_private_group_by_invite', { p_invite_token: token })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, membership: data })
  } catch {
    return NextResponse.json({ error: 'Unable to join this private group.' }, { status: 500 })
  }
}

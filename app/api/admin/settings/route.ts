import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, role: null }
  const { data: role } = await supabase.rpc('get_my_admin_role')
  if (!role) return { user: null, role: null }
  return { user, role }
}

async function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server configuration is incomplete.')
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const allowedKeys = new Set([
  'service_fee_percentage','delay_fee_percentage','auto_debit_enabled','reminder_before_days','reminder_after_days','reminder_repeat_days','max_reminders','auto_payout_enabled','default_grace_days','credit_bureau_notice_days',
  'market_registration_enabled','country_maintenance_mode_enabled','new_accounts_enabled','wallet_enabled','savings_enabled','deposits_enabled','withdrawals_enabled','transfers_enabled','global_transaction_pause',
  'card_payments_enabled','bank_transfer_payments_enabled','ussd_payments_enabled','mobile_money_payments_enabled','recurring_payments_enabled','payment_retry_enabled','webhook_processing_enabled','automatic_settlement_enabled','automatic_refund_processing_enabled','chargeback_handling_enabled','automatic_reconciliation_enabled',
  'automatic_group_formation_enabled','automatic_contribution_collection_enabled','contribution_reminders_enabled','automatic_late_fee_enabled','automatic_cycle_processing_enabled','automatic_payout_processing_enabled','early_withdrawal_enabled','missed_contribution_processing_enabled',
  'kyc_required_enabled','kyc_manual_review_enabled','manual_compliance_review_enabled','kyc_reverification_enabled','document_verification_enabled','identity_verification_enabled','enhanced_kyc_enabled','automatic_kYC_retry_enabled',
  'risk_screening_enabled','transaction_monitoring_enabled','automatic_account_freeze_enabled','large_transaction_review_enabled','suspicious_activity_review_enabled','withdrawal_risk_checks_enabled','automatic_transaction_risk_review_enabled',
  'email_notifications_enabled','sms_notifications_enabled','push_notifications_enabled','notification_payment_enabled','notification_kyc_enabled','notification_savings_enabled','notification_contribution_enabled','notification_failed_payment_enabled','notification_withdrawal_enabled','notification_security_enabled','marketing_notifications_enabled',
  'provider_health_checks_enabled','failed_webhook_retry_enabled','dormant_account_checks_enabled','wallet_freeze_enabled','savings_account_control_enabled'
])

export async function GET() {
  try {
    const { user } = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const client = await adminDb()
    const { data, error } = await client.from('system_settings').select('key,numeric_value,boolean_value,integer_value,text_value').order('key')
    if (error) throw error
    return NextResponse.json({ settings: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to load settings.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const client = await adminDb()
    const changed: Array<{ key: string; previous: unknown; next: unknown }> = []
    for (const [key, value] of Object.entries(body)) {
      if (!allowedKeys.has(key)) continue
      const { data: before } = await client.from('system_settings').select('boolean_value,numeric_value,integer_value,text_value').eq('key', key).maybeSingle()
      const patch = typeof value === 'boolean'
        ? { numeric_value: null, integer_value: null, boolean_value: value, updated_by: user.id, updated_at: new Date().toISOString() }
        : key.includes('percentage')
          ? { numeric_value: Number(value), integer_value: null, boolean_value: null, updated_by: user.id, updated_at: new Date().toISOString() }
          : { integer_value: Number(value), numeric_value: null, boolean_value: null, updated_by: user.id, updated_at: new Date().toISOString() }
      const { error } = await client.from('system_settings').update(patch).eq('key', key)
      if (error) throw error
      changed.push({ key, previous: before ?? null, next: value })
    }
    if (changed.length) {
      await client.from('audit_logs').insert({
        actor_user_id: user.id,
        action: 'UPDATE_OPERATIONAL_SETTINGS',
        entity_type: 'system_settings',
        previous_state: changed.reduce<Record<string, unknown>>((a,c)=>(a[c.key]=c.previous,a),{}),
        new_state: changed.reduce<Record<string, unknown>>((a,c)=>(a[c.key]=c.next,a),{}),
        reason: 'Admin operational control update'
      })
    }
    return NextResponse.json({ success: true, changed: changed.length })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to update settings.' }, { status: 500 })
  }
}

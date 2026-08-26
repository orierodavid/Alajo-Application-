import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Deotech Finance account service is not configured on the production server.' }, { status: 500 })

    const cookieStore = await cookies()
    let authResponse = NextResponse.json({ success: true })
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            authResponse.cookies.set(name, value, options)
          })
        },
      },
    })

    const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !signedIn.user) return NextResponse.json({ error: error?.message || 'Unable to log in.' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,status,onboarding_step')
      .eq('id', signedIn.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'No Alajo account exists for these credentials. Please register first.' }, { status: 403 })
    }

    if (profile.status && profile.status !== 'active') {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Your Alajo account is currently disabled. Please contact support.' }, { status: 403 })
    }

    // Use the authenticated client for normal access checks, but use the server-only
    // service-role client for the KYC existence check. This prevents RLS from making
    // an existing KYC record look like a brand-new customer and sending them back to
    // the KYC entry form.
    let kycQuery = supabase.from('user_kyc_profiles').select('status,provider_customer_ref').eq('user_id', signedIn.user.id).limit(1).maybeSingle()
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
      kycQuery = admin.from('user_kyc_profiles').select('status,provider_customer_ref').eq('user_id', signedIn.user.id).limit(1).maybeSingle()
    }
    const { data: anyKyc } = await kycQuery

    const [{ data: kyc }, { data: virtualAccount }] = await Promise.all([
      supabase.from('user_kyc_profiles').select('status').eq('user_id', signedIn.user.id).eq('status', 'VERIFIED').limit(1).maybeSingle(),
      supabase.from('user_virtual_accounts').select('status').eq('user_id', signedIn.user.id).eq('status', 'ACTIVE').limit(1).maybeSingle(),
    ])

    const verificationComplete = profile.onboarding_step === 'complete' && !!kyc && !!virtualAccount
    const hasSubmittedKyc = !!anyKyc || !!profile.onboarding_step && profile.onboarding_step !== 'kyc'
    const redirectTo = verificationComplete ? '/dashboard' : hasSubmittedKyc ? '/kyc/status' : '/kyc'
    const finalResponse = NextResponse.json({ success: true, redirectTo })
    authResponse.cookies.getAll().forEach(cookie => finalResponse.cookies.set(cookie))
    return finalResponse
  } catch {
    return NextResponse.json({ error: 'Unable to log in right now. Please try again.' }, { status: 500 })
  }
}

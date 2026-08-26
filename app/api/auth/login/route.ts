import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Deotech Finance account service is not configured on the production server.' }, { status: 500 })
    const cookieStore = await cookies()
    const response = NextResponse.json({ success: true })
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll(){ return cookieStore.getAll() },
        setAll(cookiesToSet){ cookiesToSet.forEach(({name,value,options})=>{ cookieStore.set(name,value,options); response.cookies.set(name,value,options) }) },
      },
    })
    const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !signedIn.user) return NextResponse.json({ error: error?.message || 'Unable to log in.' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('status,onboarding_step').eq('id', signedIn.user.id).maybeSingle()
    if (profile?.status === 'suspended') {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Your Deotech Finance account is currently disabled. Please contact support.' }, { status: 403 })
    }

    const [{ data: kyc }, { data: virtualAccount }] = await Promise.all([
      supabase.from('user_kyc_profiles').select('status').eq('user_id', signedIn.user.id).eq('status', 'VERIFIED').limit(1).maybeSingle(),
      supabase.from('user_virtual_accounts').select('status').eq('user_id', signedIn.user.id).eq('status', 'ACTIVE').limit(1).maybeSingle(),
    ])

    const verificationComplete = profile?.onboarding_step === 'complete' && !!kyc && !!virtualAccount
    const redirectTo = verificationComplete ? '/dashboard' : kyc ? '/kyc/status' : '/kyc'
    const finalResponse = NextResponse.json({ success: true, redirectTo })
    response.cookies.getAll().forEach(cookie => finalResponse.cookies.set(cookie))
    return finalResponse
  } catch {
    return NextResponse.json({ error: 'Unable to log in right now. Please try again.' }, { status: 500 })
  }
}

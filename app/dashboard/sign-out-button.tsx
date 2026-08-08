'use client'

import { createClient } from '@/lib/supabase/client'

export default function SignOutButton(){async function signOut(){const supabase=createClient();await supabase.auth.signOut();window.location.assign('/login')}return <button onClick={signOut} className="px-4 py-2 rounded-md border border-gray-200 text-sm font-semibold">Logout</button>}

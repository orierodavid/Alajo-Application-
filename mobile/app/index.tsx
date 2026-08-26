import { useEffect } from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/auth'
import { getBootstrap } from '../lib/api'

export default function Index() {
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
        if (!active) return
        if (!data.session) return router.replace('/login')
        const bootstrap: any = await getBootstrap()
        if (!active) return
        if (!bootstrap?.authenticated || !bootstrap?.user?.profile) return router.replace('/login')
        const kyc = String(bootstrap.verification?.kycStatus ?? '').toUpperCase()
        const dva = String(bootstrap.verification?.virtualAccountStatus ?? '').toUpperCase()
        if (kyc === 'VERIFIED' && dva === 'ACTIVE') return router.replace('/dashboard')
        router.replace('/kyc')
      } catch {
        if (active) router.replace('/login')
      }
    })()
    return () => { active = false }
  }, [])
  return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="small" /></View></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#f5f7f5'},center:{flex:1,alignItems:'center',justifyContent:'center'}})

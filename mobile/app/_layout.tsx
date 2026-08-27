import { Stack } from 'expo-router'

export default function Layout(){
  return <Stack screenOptions={{headerShown:false,animation:'fade',contentStyle:{backgroundColor:'#f5f7f5'}}} />
}

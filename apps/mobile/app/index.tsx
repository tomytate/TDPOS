import { Redirect } from 'expo-router'

import { useAuthStore } from '@/stores/auth-store'

export default function IndexRoute() {
  const isSignedIn = useAuthStore((state) => !!state.userId)

  return <Redirect href={isSignedIn ? '/(app)/(tabs)' : '/(auth)/sign-in'} />
}

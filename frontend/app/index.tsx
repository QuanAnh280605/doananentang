import { Redirect } from 'expo-router';

import { getAccessToken } from '@/lib/session';

export default function IndexScreen() {
  const token = getAccessToken();
  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}

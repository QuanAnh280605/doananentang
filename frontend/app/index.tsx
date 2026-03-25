import { Redirect } from 'expo-router';

import { getAccessToken } from '@/lib/session';

export default function IndexScreen() {
  return <Redirect href={getAccessToken() ? '/(tabs)' : '/login'} />;
}

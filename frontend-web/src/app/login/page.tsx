import { LoginForm } from '@/components/auth/LoginForm';

type LoginPageProps = {
  searchParams?: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <LoginForm statusMessage={params?.message ?? null} />;
}

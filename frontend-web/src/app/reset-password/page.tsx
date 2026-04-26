import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

type ResetPasswordPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return <ResetPasswordForm token={params?.token} />;
}

import { ReactNode } from 'react';

type AdminProtectedPageProps = {
  children: ReactNode;
};

export function AdminProtectedPage({ children }: AdminProtectedPageProps) {
  return <>{children}</>;
}

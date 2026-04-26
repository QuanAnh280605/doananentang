import type { ReactNode } from 'react';

type AuthShellProps = {
  card: ReactNode;
  promo: ReactNode;
};

export function AuthShell({ card, promo }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#F4F8FF] px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 md:max-w-6xl md:flex-row md:items-start md:gap-8 md:py-6">
        <section className="relative overflow-hidden rounded-[32px] bg-[#E9F2FF] px-5 py-6 md:min-h-[736px] md:flex-1 md:px-10 md:py-12">
          <div className="absolute left-[-48px] top-[-32px] h-36 w-36 rounded-full bg-white/60" />
          <div className="absolute bottom-[-80px] right-[-20px] h-52 w-52 rounded-full bg-[#CCE0FF]" />
          <div className="absolute right-10 top-12 h-16 w-16 rounded-[24px] bg-white/80" />
          {promo}
        </section>

        <div className="w-full md:w-[420px] md:shrink-0">{card}</div>
      </div>
    </main>
  );
}

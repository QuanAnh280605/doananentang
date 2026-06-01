import { Suspense } from 'react';

import { HomeFeed } from '@/components/feed/HomeFeed';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#EDF1F5]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A9FD8] border-t-transparent" />
      </div>
    }>
      <HomeFeed />
    </Suspense>
  );
}

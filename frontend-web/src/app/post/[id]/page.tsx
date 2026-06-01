'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { ThemedText } from '@/components/ui/ThemedText';

/**
 * Post detail page — redirects to home feed with postId query param
 * so the PostDetailModal opens there instead of a separate page.
 */
export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id;

  useEffect(() => {
    if (postId) {
      router.replace(`/?postId=${postId}`);
    } else {
      router.replace('/');
    }
  }, [postId, router]);

  return (
    <ProtectedPage>
      <div className="flex h-screen items-center justify-center bg-[#EDF1F5]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A9FD8] border-t-transparent" />
          <ThemedText className="text-[14px] font-semibold text-slate-500">
            Đang chuyển hướng...
          </ThemedText>
        </div>
      </div>
    </ProtectedPage>
  );
}

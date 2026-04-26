'use client';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';

function ExploreCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[#E4E8EE] bg-white p-5">
      <ThemedText as="h2" className="text-[22px] font-semibold text-slate-950">{title}</ThemedText>
      <div className="mt-4 space-y-3 text-slate-600">{children}</div>
    </section>
  );
}

export function ExploreView() {
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-50 pb-8">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav searchPlaceholder="Search routing, styling, and shared components" />
          <div className="mt-4 rounded-[32px] bg-[#DBEAFE] px-6 py-10">
            <ThemedText type="eyebrow">Architecture</ThemedText>
            <ThemedText as="h1" className="mt-3 text-4xl font-bold tracking-[-0.03em] text-slate-950">Explore setup</ThemedText>
            <ThemedText as="p" className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Man nay tong hop cach frontend duoc to chuc sau khi chuyen qua NativeWind.</ThemedText>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ExploreCard title="Routing voi Expo Router">
              <ThemedText as="p" className="text-slate-600">Moi file trong app/ la mot route. Home nam o app/(tabs)/index.tsx va tab layout nam o app/(tabs)/_layout.tsx.</ThemedText>
              <a className="text-base font-semibold text-blue-600" href="https://docs.expo.dev/router/introduction/" rel="noreferrer" target="_blank">Xem tai lieu Expo Router</a>
            </ExploreCard>
            <ExploreCard title="Styling voi NativeWind">
              <ThemedText as="p" className="text-slate-600">UI hien tai uu tien className utility-first thay vi bo token mau light/dark cu. Nhung phan animation va transform van de bang style object khi can.</ThemedText>
              <div className="rounded-2xl bg-slate-100 p-3 font-mono text-sm text-slate-700">{'<View className="rounded-3xl bg-white p-4" />'}</div>
            </ExploreCard>
            <ExploreCard title="Shared components">
              <ThemedText as="p" className="text-slate-600">Cac wrapper nhu ThemedText va ThemedView gio chi dong vai tro helper nhe de gom variant text va nhan className.</ThemedText>
            </ExploreCard>
            <ExploreCard title="Assets va media">
              <ThemedText as="p" className="text-slate-600">Anh tinh van dung expo-image. Viec canh kich thuoc, absolute positioning, hay animation cho media co the ket hop giua NativeWind va style object.</ThemedText>
              <div className="mx-auto h-[84px] w-[84px] rounded-3xl bg-[#BFDBFE]" />
            </ExploreCard>
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
}

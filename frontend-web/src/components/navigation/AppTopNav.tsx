import { ThemedText } from '@/components/ui/ThemedText';

type AppTopNavProps = {
  searchPlaceholder?: string;
  avatarInitials?: string;
};

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-[#666666]">
      {children}
    </div>
  );
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center">{children}</span>;
}

export function AppTopNav({
  searchPlaceholder = 'Search people, notes, or screenshots',
  avatarInitials = 'LE',
}: AppTopNavProps) {
  return (
    <div className="rounded-[28px] border border-[#E4E8EE] bg-white px-5 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-4 md:flex-1 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#4A9FD8] text-white">
              <NavIcon>+</NavIcon>
            </div>
            <div>
              <ThemedText as="p" className="text-[26px] font-semibold tracking-[-0.5px] text-slate-950">
                Northfeed
              </ThemedText>
              <ThemedText as="p" className="text-sm text-slate-500">
                studio
              </ThemedText>
            </div>
          </div>

          <div className="rounded-[22px] bg-[#F7F8FA] px-4 py-4 md:ml-6 md:max-w-[560px] md:flex-1">
            <div className="flex items-center gap-3">
              <span className="text-[#666666]">⌕</span>
              <ThemedText as="p" className="flex-1 text-base text-slate-500">
                {searchPlaceholder}
              </ThemedText>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <IconBubble>
            <span aria-hidden>✉</span>
          </IconBubble>
          <IconBubble>
            <span aria-hidden>◌</span>
          </IconBubble>
          <IconBubble>
            <span aria-hidden>⋮</span>
          </IconBubble>
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#EAF4FB]">
            <ThemedText as="span" className="text-base font-semibold tracking-[0.5px] text-slate-900">
              {avatarInitials}
            </ThemedText>
          </div>
        </div>
      </div>
    </div>
  );
}

export const appColors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E4E8EE',
  accent: '#4A9FD8',
  accentHover: '#2F8BC9',
  accentSoft: '#EAF4FB',
} as const;

export const surfaceClass = 'rounded-[24px] border border-[#E4E8EE] bg-white';
export const elevatedSurfaceClass = 'rounded-[32px] border border-[#E4E8EE] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]';
export const interactiveSurfaceClass = `${surfaceClass} transition-all hover:border-slate-300 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]`;
export const mutedSurfaceClass = 'rounded-[24px] bg-[#F1F5F9]';

export const controlClass = 'rounded-[18px]';
export const avatarClass = 'rounded-[14px]';

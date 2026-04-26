export type ApiUrlSource = 'env' | 'env-localhost-rewritten' | 'native-auto' | 'fallback';

export function normalizeApiUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.replace(/\/$/, '');
}

export function isLoopbackUrl(value: string): boolean {
  return (
    value.includes('://localhost') ||
    value.includes('://127.0.0.1') ||
    value.includes('://0.0.0.0')
  );
}

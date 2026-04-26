export type ApiUrlSource = 'env' | 'env-localhost-rewritten' | 'native-auto' | 'fallback';

export type TokenRefreshResponse = {
  access_token: string;
  refresh_token: string;
};

export function normalizeApiUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.replace(/\/$/, '');
}

function formatFieldLabel(value: string): string {
  const normalized = value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return value;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatApiErrorDetail(detail: unknown): string | null {
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const errorItem = item as { loc?: unknown; msg?: unknown };

        if (typeof errorItem.msg !== 'string') {
          return null;
        }

        if (Array.isArray(errorItem.loc)) {
          const field = errorItem.loc[errorItem.loc.length - 1];

          if (typeof field === 'string' || typeof field === 'number') {
            return `${formatFieldLabel(String(field))}: ${errorItem.msg}`;
          }
        }

        return errorItem.msg;
      })
      .filter((message): message is string => Boolean(message));

    return messages.length ? messages.join('\n') : 'Dữ liệu không hợp lệ';
  }

  return null;
}

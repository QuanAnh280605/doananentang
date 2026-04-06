import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/session';

export type GenderValue = 'female' | 'male' | 'custom';

export type AuthUser = {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: GenderValue;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: 'bearer';
  user: AuthUser;
};

export type RegisterFormState = {
  contact: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'Female' | 'Male' | 'Custom';
};

export type RegisterRequest = {
  contact: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: GenderValue;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  new_password: string;
};

export type MessageResponse = {
  message: string;
};

function normalizeText(value: string): string {
  return value.trim();
}

export function formatBirthDate(value: string): string {
  const trimmed = normalizeText(value);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return trimmed;
  }

  const localMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    return `${year}-${month}-${day}`;
  }

  throw new Error('Date of birth must use DD/MM/YYYY or YYYY-MM-DD');
}

export function mapGender(value: RegisterFormState['gender']): GenderValue {
  return value.toLowerCase() as GenderValue;
}

export function buildRegisterRequest(form: RegisterFormState): RegisterRequest {
  return {
    contact: normalizeText(form.contact),
    password: form.password,
    first_name: normalizeText(form.firstName),
    last_name: normalizeText(form.lastName),
    birth_date: form.birthDate ? formatBirthDate(form.birthDate) : null,
    gender: mapGender(form.gender),
  };
}

export function buildLoginRequest(identifier: string, password: string): LoginRequest {
  return {
    identifier: normalizeText(identifier),
    password,
  };
}

export function buildForgotPasswordRequest(email: string): ForgotPasswordRequest {
  return {
    email: normalizeText(email),
  };
}

export function buildResetPasswordRequest(token: string, newPassword: string): ResetPasswordRequest {
  return {
    token: normalizeText(token),
    new_password: newPassword,
  };
}

export { getAccessToken, setAccessToken } from '@/lib/session';

export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  await setAccessToken(response.access_token);
  return response;
}

export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  await setAccessToken(response.access_token);
  return response;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No active access token');
  }

  return apiFetch<AuthUser>('/api/auth/me');
}

export async function requestPasswordReset(payload: ForgotPasswordRequest): Promise<MessageResponse> {
  const params = new URLSearchParams({
    email: payload.email,
  });

  return apiFetch<MessageResponse>(`/api/auth/forgot-password?${params}`, {
    method: 'POST',
  });
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<MessageResponse> {
  const params = new URLSearchParams({
    token: payload.token,
    password: payload.new_password,
  });

  return apiFetch<MessageResponse>(`/api/auth/reset-password?${params}`, {
    method: 'POST',
  });
}

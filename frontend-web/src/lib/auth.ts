import { apiFetch, API_URL } from '@/lib/api';
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from '@/lib/session';

export type GenderValue = 'female' | 'male' | 'custom';

export type AuthUser = {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: GenderValue;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  user: AuthUser;
};

export type SearchUser = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export type FollowUser = SearchUser & {
  is_following: boolean;
};

export type FollowStatus = {
  user_id: number;
  is_following: boolean;
  followers_count: number;
  following_count: number;
};

export type PaginatedFollowUsersResponse = {
  items: FollowUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
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

export { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from '@/lib/session';

export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  await setAuthTokens(response.access_token, response.refresh_token);
  return response;
}

export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  await setAuthTokens(response.access_token, response.refresh_token);
  return response;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/auth/me');
}

export async function searchUsers(query: string, limit = 20): Promise<SearchUser[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  return apiFetch<SearchUser[]>(`/api/users/search?${params}`);
}

export async function searchFollowingUsers(query: string, limit = 20): Promise<SearchUser[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  return apiFetch<SearchUser[]>(`/api/users/following/search?${params}`);
}

export async function fetchFollowStatus(userId: number): Promise<FollowStatus> {
  return apiFetch<FollowStatus>(`/api/users/${userId}/follow-status`);
}

export async function fetchFollowers(userId: number, page = 1, pageSize = 20): Promise<PaginatedFollowUsersResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiFetch<PaginatedFollowUsersResponse>(`/api/users/${userId}/followers?${params}`);
}

export async function fetchFollowing(userId: number, page = 1, pageSize = 20): Promise<PaginatedFollowUsersResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiFetch<PaginatedFollowUsersResponse>(`/api/users/${userId}/following?${params}`);
}

export async function followUser(userId: number): Promise<FollowStatus> {
  return apiFetch<FollowStatus>(`/api/users/${userId}/follow`, {
    method: 'POST',
  });
}

export async function unfollowUser(userId: number): Promise<FollowStatus> {
  return apiFetch<FollowStatus>(`/api/users/${userId}/follow`, {
    method: 'DELETE',
  });
}

export async function logoutUser(): Promise<void> {
  const refreshToken = await getRefreshToken();

  try {
    if (refreshToken) {
      await apiFetch<void>('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } finally {
    await clearAuthTokens();
  }
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

export type UserUpdatePayload = {
  first_name?: string;
  last_name?: string;
  bio?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: GenderValue;
  city?: string | null;
};

export async function updateUserProfile(payload: UserUpdatePayload): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export async function uploadUserAvatar(file: File): Promise<{ message: string; avatar_url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  // apiFetch needs custom handling for FormData so we override content-type
  const response = await fetch(`${API_URL}/api/users/me/avatar`, {
    method: 'PATCH',
    body: formData,
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload avatar');
  }

  return response.json();
}

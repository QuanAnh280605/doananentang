type ProfileDetailSearchParams = {
  name?: string;
  initials?: string;
  preview?: string;
  bio?: string;
};

function buildSearchParams(params?: ProfileDetailSearchParams): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  profile: '/profile',
  profileDetail: (userId: string, params?: ProfileDetailSearchParams) => `/profile/${userId}${buildSearchParams(params)}`,
  inbox: '/inbox',
  explore: '/explore',
} as const;

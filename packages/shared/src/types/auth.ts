export type TokenRefreshResponse = {
  access_token: string;
  refresh_token: string;
};

export type JwtPayload = {
  exp?: number;
};

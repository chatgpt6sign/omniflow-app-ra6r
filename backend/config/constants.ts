export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

export const JWT_SECRET: string =
  process.env.JWT_SECRET || 'omniflow-dev-secret-change-me';

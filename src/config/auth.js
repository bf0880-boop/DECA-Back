import { betterAuth } from 'better-auth';
import { dash } from '@better-auth/infra';
import pool from './db.js';
import env from './env.js';

export const auth = betterAuth({
  database: pool,
  secret: env.betterAuth.secret,
  baseURL: env.betterAuth.baseURL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [dash()],
});

export default auth;

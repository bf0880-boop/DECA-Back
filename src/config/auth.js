import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { dash } from '@better-auth/infra';
import bcrypt from 'bcryptjs';
import pool from './db.js';
import env from './env.js';

export const auth = betterAuth({
  database: pool,
  secret: env.betterAuth.secret,
  baseURL: env.betterAuth.baseURL,
  basePath: '/auth',
  // sign-up/sign-in quedan cerrados a HTTP público: solo se usan como llamadas
  // internas (auth.api.*) desde usuarioController/medicoController/adminController,
  // que son los que validan reglas de negocio (dni único, aprobación de médicos, etc).
  disabledPaths: ['/sign-up/email', '/sign-in/email'],
  emailAndPassword: {
    enabled: true,
    // Reutiliza bcrypt (mismo esquema que ya usan pacientes/medicos/admins) para
    // que las cuentas migradas con su hash existente sigan pudiendo loguearse.
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        input: true,
      },
    },
  },
  plugins: [dash(), bearer()],
});

export async function eliminarUsuarioAuth(authUserId) {
  await pool.query('DELETE FROM "user" WHERE id = $1', [authUserId]);
}

export default auth;

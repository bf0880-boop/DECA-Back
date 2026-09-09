import { betterAuth } from 'better-auth';
import { bearer, emailOTP } from 'better-auth/plugins';
import { dash } from '@better-auth/infra';
import bcrypt from 'bcryptjs';
import pool from './db.js';
import env from './env.js';
import { enviarCodigoVerificacion } from './mailer.js';

export const auth = betterAuth({
  database: pool,
  secret: env.betterAuth.secret,
  baseURL: env.betterAuth.baseURL,
  basePath: '/auth',
  // sign-up/sign-in quedan cerrados a HTTP público: solo se usan como llamadas
  // internas (auth.api.*) desde usuarioController/medicoController/adminController,
  // que son los que validan reglas de negocio (dni único, aprobación de médicos, etc).
  // /sign-in/email-otp también se cierra: entrar sólo con el código saltearía esas reglas.
  disabledPaths: ['/sign-up/email', '/sign-in/email', '/sign-in/email-otp'],
  emailAndPassword: {
    enabled: true,
    // Nadie entra sin confirmar el código que le llegó al mail: signInEmail tira
    // FORBIDDEN/EMAIL_NOT_VERIFIED mientras user.emailVerified siga en false.
    requireEmailVerification: true,
    // Reutiliza bcrypt (mismo esquema que ya usan pacientes/medicos/admins) para
    // que las cuentas migradas con su hash existente sigan pudiendo loguearse.
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  emailVerification: {
    // El código lo manda el controller recién después de crear el perfil, así no
    // le llega un mail a alguien cuyo registro terminó fallando por dni repetido.
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
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
  plugins: [
    dash(),
    bearer(),
    emailOTP({
      otpLength: 6,
      expiresIn: env.verificationCodeTtlMinutes * 60,
      // Reemplaza el mail con link de verificación por el del código de 6 dígitos.
      overrideDefaultEmailVerification: true,
      // Sin esto, pedir un código para un mail no registrado crearía la cuenta.
      disableSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        await enviarCodigoVerificacion({ email, codigo: otp, tipo: type });
      },
    }),
  ],
});

const TIPO_VERIFICACION_MAIL = 'email-verification';

export function esErrorMailNoVerificado(err) {
  return err?.body?.code === 'EMAIL_NOT_VERIFIED';
}

export async function enviarCodigoDeVerificacion(mail) {
  await auth.api.sendVerificationOTP({
    body: { email: mail, type: TIPO_VERIFICACION_MAIL },
  });
}

export async function verificarCodigoDeMail(mail, codigo) {
  return auth.api.verifyEmailOTP({ body: { email: mail, otp: String(codigo) } });
}

export async function eliminarUsuarioAuth(authUserId) {
  await pool.query('DELETE FROM "user" WHERE id = $1', [authUserId]);
}

export default auth;

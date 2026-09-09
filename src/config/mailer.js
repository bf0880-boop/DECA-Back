import nodemailer from 'nodemailer';
import env from './env.js';

let transporterCache;

function getTransporter() {
  if (transporterCache !== undefined) return transporterCache;

  const { host, port, user, pass } = env.mail;

  transporterCache = host && user && pass
    ? nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
    : null;

  return transporterCache;
}

async function enviarMail({ to, subject, text, html }) {
  const transporter = getTransporter();

  // Sin SMTP configurado no cortamos el flujo: dejamos el mail en la consola para
  // poder probar la verificación en desarrollo.
  if (!transporter) {
    console.warn(`[mailer] SMTP sin configurar. Mail que se habría enviado a ${to}:\n${subject}\n${text}`);
    return { enviado: false };
  }

  await transporter.sendMail({ from: env.mail.from, to, subject, text, html });
  return { enviado: true };
}

const ASUNTOS = {
  'email-verification': 'Tu código de verificación de DECA',
  'sign-in': 'Tu código para ingresar a DECA',
  'forget-password': 'Tu código para recuperar tu contraseña de DECA',
  'change-email': 'Tu código para cambiar el mail de tu cuenta de DECA',
};

function plantilla({ codigo, minutos }) {
  return `<!doctype html>
<div style="font-family: Arial, Helvetica, sans-serif; color: #1f2933; max-width: 480px; margin: 0 auto;">
  <h2 style="color: #0b6b5b;">DECA</h2>
  <p>Este es tu código de verificación:</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">${codigo}</p>
  <p>Vence en ${minutos} minuto(s). Si no pediste este código, ignorá este mail.</p>
</div>`;
}

async function enviarCodigoVerificacion({ email, codigo, tipo = 'email-verification' }) {
  const minutos = env.verificationCodeTtlMinutes;

  return enviarMail({
    to: email,
    subject: ASUNTOS[tipo] || ASUNTOS['email-verification'],
    text: `Tu código de verificación de DECA es ${codigo}. Vence en ${minutos} minuto(s).`,
    html: plantilla({ codigo, minutos }),
  });
}

export { enviarMail, enviarCodigoVerificacion };
export default { enviarMail, enviarCodigoVerificacion };

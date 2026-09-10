import { describe, it, expect, vi, afterEach } from 'vitest';

import nodemailer from 'nodemailer';
import env from './env.js';

const mailOriginal = { ...env.mail };

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  Object.assign(env.mail, mailOriginal);
});

describe('enviarMail', () => {
  it('deja el mail en consola sin SMTP configurado en vez de fallar', async () => {
    Object.assign(env.mail, { host: undefined, user: undefined, pass: undefined });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const createTransportSpy = vi.spyOn(nodemailer, 'createTransport');
    const { default: mailer } = await import('./mailer.js');

    const resultado = await mailer.enviarMail({ to: 'juana@test.com', subject: 'Asunto', text: 'Cuerpo' });

    expect(resultado).toEqual({ enviado: false });
    expect(createTransportSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('juana@test.com'));
  });

  it('envía el mail con el transporter cuando hay SMTP configurado', async () => {
    const { default: freshEnv } = await import('./env.js');
    Object.assign(freshEnv.mail, { host: 'smtp.test.com', port: 587, user: 'usuario', pass: 'clave' });
    const sendMail = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail });
    const { default: mailer } = await import('./mailer.js');

    const resultado = await mailer.enviarMail({
      to: 'juana@test.com',
      subject: 'Asunto',
      text: 'Cuerpo',
      html: '<p>Cuerpo</p>',
    });

    expect(resultado).toEqual({ enviado: true });
    expect(sendMail).toHaveBeenCalledWith({
      from: freshEnv.mail.from,
      to: 'juana@test.com',
      subject: 'Asunto',
      text: 'Cuerpo',
      html: '<p>Cuerpo</p>',
    });
  });
});

describe('enviarCodigoVerificacion', () => {
  it('arma el asunto y el cuerpo con el código de 6 dígitos', async () => {
    Object.assign(env.mail, { host: undefined, user: undefined, pass: undefined });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { default: mailer } = await import('./mailer.js');

    const resultado = await mailer.enviarCodigoVerificacion({ email: 'juana@test.com', codigo: '123456' });

    expect(resultado).toEqual({ enviado: false });
    const [mensaje] = warnSpy.mock.calls[0];
    expect(mensaje).toContain('juana@test.com');
    expect(mensaje).toContain('123456');
  });
});

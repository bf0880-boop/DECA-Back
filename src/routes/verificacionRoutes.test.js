import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';

import usuarioModel from '../models/usuarioModel.js';
import verificacionModel from '../models/verificacionModel.js';
import mailer from '../config/mailer.js';
import app from '../server.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /verificacion/enviar', () => {
  it('devuelve 400 si faltan datos', async () => {
    const res = await request(app).post('/verificacion/enviar').send({});

    expect(res.status).toBe(400);
  });

  it('devuelve ok y envía el código si el paciente existe', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue({ id: 1, mail: 'juana@test.com', mail_verificado: false });
    vi.spyOn(verificacionModel, 'crearCodigo').mockResolvedValue('123456');
    const enviarMailSpy = vi.spyOn(mailer, 'enviarCodigoVerificacion').mockResolvedValue({ enviado: true });

    const res = await request(app).post('/verificacion/enviar').send({ mail: 'juana@test.com', rol: 'paciente' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ ok: true }));
    expect(enviarMailSpy).toHaveBeenCalledWith({ email: 'juana@test.com', codigo: '123456' });
  });
});

describe('POST /verificacion/confirmar', () => {
  it('devuelve 400 si el código es inválido', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue({ id: 1, mail: 'juana@test.com' });
    vi.spyOn(verificacionModel, 'consumirCodigo').mockResolvedValue(false);

    const res = await request(app)
      .post('/verificacion/confirmar')
      .send({ mail: 'juana@test.com', rol: 'paciente', codigo: '000000' });

    expect(res.status).toBe(400);
  });

  it('verifica el mail cuando el código es correcto', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue({ id: 1, mail: 'juana@test.com' });
    vi.spyOn(verificacionModel, 'consumirCodigo').mockResolvedValue(true);
    const marcarSpy = vi.spyOn(verificacionModel, 'marcarMailVerificado').mockResolvedValue(undefined);

    const res = await request(app)
      .post('/verificacion/confirmar')
      .send({ mail: 'juana@test.com', rol: 'paciente', codigo: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ ok: true }));
    expect(marcarSpy).toHaveBeenCalledWith('paciente', 1);
  });
});

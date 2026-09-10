import { describe, it, expect, vi, afterEach } from 'vitest';

import mailer from '../config/mailer.js';
import verificacionModel from '../models/verificacionModel.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import adminModel from '../models/adminModel.js';
import verificacionController from './verificacionController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enviarCodigo', () => {
  it('genera el código, lo guarda y lo envía por mail', async () => {
    const crearCodigoSpy = vi.spyOn(verificacionModel, 'crearCodigo').mockResolvedValue('123456');
    const enviarMailSpy = vi.spyOn(mailer, 'enviarCodigoVerificacion').mockResolvedValue({ enviado: true });
    const usuario = { id: 1, mail: 'juana@test.com' };

    await verificacionController.enviarCodigo('paciente', usuario);

    expect(crearCodigoSpy).toHaveBeenCalledWith('paciente', 1, expect.any(Number));
    expect(enviarMailSpy).toHaveBeenCalledWith({ email: 'juana@test.com', codigo: '123456' });
  });

  it('no propaga el error si falla el envío', async () => {
    vi.spyOn(verificacionModel, 'crearCodigo').mockRejectedValue(new Error('SMTP caído'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const usuario = { id: 1, mail: 'juana@test.com' };

    await expect(verificacionController.enviarCodigo('paciente', usuario)).resolves.toBeUndefined();
  });
});

describe('enviar', () => {
  it('devuelve 400 si falta el mail', async () => {
    const req = { body: { rol: 'paciente' } };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 400 si el rol es inválido', async () => {
    const req = { body: { mail: 'juana@test.com', rol: 'otro' } };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('responde ok sin enviar nada si el mail no está registrado', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(null);
    const crearCodigoSpy = vi.spyOn(verificacionModel, 'crearCodigo');
    const req = { body: { mail: 'nadie@test.com', rol: 'paciente' } };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(crearCodigoSpy).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('responde ok sin enviar nada si el mail ya está verificado', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue({ id: 1, mail: 'juana@test.com', mail_verificado: true });
    const crearCodigoSpy = vi.spyOn(verificacionModel, 'crearCodigo');
    const req = { body: { mail: 'juana@test.com', rol: 'paciente' } };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(crearCodigoSpy).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('envía el código si el usuario existe y todavía no verificó el mail', async () => {
    const usuario = { id: 1, mail: 'juana@test.com', mail_verificado: false };
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(usuario);
    vi.spyOn(verificacionModel, 'crearCodigo').mockResolvedValue('123456');
    const enviarMailSpy = vi.spyOn(mailer, 'enviarCodigoVerificacion').mockResolvedValue({ enviado: true });
    const req = { body: { mail: 'juana@test.com', rol: 'paciente' } };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(enviarMailSpy).toHaveBeenCalledWith({ email: 'juana@test.com', codigo: '123456' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('devuelve 500 si ocurre un error inesperado', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockRejectedValue(new Error('fallo de conexión'));
    const req = { body: { mail: 'juana@test.com', rol: 'paciente' } };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('confirmar', () => {
  it('devuelve 400 si falta el mail, el rol o el código', async () => {
    const req = { body: { mail: 'juana@test.com' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 400 si no existe el usuario con ese mail', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue(null);
    const req = { body: { mail: 'carlos@test.com', rol: 'medico', codigo: '123456' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El código es inválido o venció.' });
  });

  it('devuelve 400 si el código es inválido o venció', async () => {
    vi.spyOn(adminModel, 'buscarPorMail').mockResolvedValue({ id: 3, mail: 'ana@test.com' });
    vi.spyOn(verificacionModel, 'consumirCodigo').mockResolvedValue(false);
    const req = { body: { mail: 'ana@test.com', rol: 'admin', codigo: '000000' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El código es inválido o venció.' });
  });

  it('marca el mail como verificado cuando el código es correcto', async () => {
    const usuario = { id: 1, mail: 'juana@test.com' };
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(usuario);
    vi.spyOn(verificacionModel, 'consumirCodigo').mockResolvedValue(true);
    const marcarSpy = vi.spyOn(verificacionModel, 'marcarMailVerificado').mockResolvedValue(undefined);
    const req = { body: { mail: 'juana@test.com', rol: 'paciente', codigo: '123456' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(marcarSpy).toHaveBeenCalledWith('paciente', 1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('devuelve 500 si ocurre un error inesperado', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockRejectedValue(new Error('fallo de conexión'));
    const req = { body: { mail: 'juana@test.com', rol: 'paciente', codigo: '123456' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

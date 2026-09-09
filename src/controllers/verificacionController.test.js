import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { enviarCodigoDeVerificacion, verificarCodigoDeMail } from '../config/auth.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import verificacionController from './verificacionController.js';

vi.mock('../config/auth.js', () => ({
  enviarCodigoDeVerificacion: vi.fn(),
  verificarCodigoDeMail: vi.fn(),
}));

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

beforeEach(() => {
  enviarCodigoDeVerificacion.mockReset().mockResolvedValue(undefined);
  verificarCodigoDeMail.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enviar', () => {
  it('devuelve 400 si falta el mail', async () => {
    const req = { body: {} };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(enviarCodigoDeVerificacion).not.toHaveBeenCalled();
  });

  it('pide el código y responde ok', async () => {
    const req = { body: { mail: 'juana@test.com' } };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(enviarCodigoDeVerificacion).toHaveBeenCalledWith('juana@test.com');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('devuelve 500 si falla el envío', async () => {
    enviarCodigoDeVerificacion.mockRejectedValue(new Error('SMTP caído'));
    const req = { body: { mail: 'juana@test.com' } };
    const res = mockRes();

    await verificacionController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'SMTP caído' });
  });
});

describe('confirmar', () => {
  it('devuelve 400 si falta el mail o el código', async () => {
    const req = { body: { mail: 'juana@test.com' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(verificarCodigoDeMail).not.toHaveBeenCalled();
  });

  it('devuelve 400 si el código es inválido o venció', async () => {
    verificarCodigoDeMail.mockRejectedValue(new Error('Invalid OTP'));
    const req = { body: { mail: 'juana@test.com', codigo: '000000' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El código es inválido o venció.' });
  });

  it('devuelve 404 si no existe el perfil asociado', async () => {
    verificarCodigoDeMail.mockResolvedValue({
      token: 'token-simulado',
      user: { id: 'auth-1', role: 'paciente' },
    });
    vi.spyOn(usuarioModel, 'buscarPorAuthUserId').mockResolvedValue(null);
    const req = { body: { mail: 'juana@test.com', codigo: '123456' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve el token y el perfil del paciente cuando el código es correcto', async () => {
    const paciente = { id: 1, nombre: 'Juana', mail: 'juana@test.com' };
    verificarCodigoDeMail.mockResolvedValue({
      token: 'token-simulado',
      user: { id: 'auth-1', role: 'paciente' },
    });
    vi.spyOn(usuarioModel, 'buscarPorAuthUserId').mockResolvedValue(paciente);
    const req = { body: { mail: 'juana@test.com', codigo: '123456' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(verificarCodigoDeMail).toHaveBeenCalledWith('juana@test.com', '123456');
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      token: 'token-simulado',
      rol: 'paciente',
      usuario: paciente,
    });
  });

  it('no entrega token al médico que todavía no aprobó el admin', async () => {
    verificarCodigoDeMail.mockResolvedValue({
      token: 'token-simulado',
      user: { id: 'auth-2', role: 'medico' },
    });
    vi.spyOn(medicoModel, 'buscarPorAuthUserId').mockResolvedValue({ id: 2, verificado: false });
    const req = { body: { mail: 'carlos@test.com', codigo: '123456' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, token: null, requiereAprobacion: true })
    );
  });

  it('entrega token al médico ya aprobado', async () => {
    const medico = { id: 2, nombre: 'Carlos', verificado: true };
    verificarCodigoDeMail.mockResolvedValue({
      token: 'token-simulado',
      user: { id: 'auth-2', role: 'medico' },
    });
    vi.spyOn(medicoModel, 'buscarPorAuthUserId').mockResolvedValue(medico);
    const req = { body: { mail: 'carlos@test.com', codigo: '123456' } };
    const res = mockRes();

    await verificacionController.confirmar(req, res);

    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      token: 'token-simulado',
      rol: 'medico',
      usuario: medico,
    });
  });
});

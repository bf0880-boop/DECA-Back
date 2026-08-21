import { describe, it, expect, vi, afterEach } from 'vitest';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import medicoModel from '../models/medicoModel.js';
import medicoController from './medicoController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('login', () => {
  it('devuelve 400 si falta el mail o la contraseña', async () => {
    const req = { body: { mail: 'carlos@test.com' } };
    const res = mockRes();

    await medicoController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 401 si el médico no existe', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue(null);
    const req = { body: { mail: 'carlos@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await medicoController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Credenciales inválidas.' });
  });

  it('devuelve 401 si la contraseña no coincide', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue({ id: 2, contrasena: 'hash-guardado' });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    const req = { body: { mail: 'carlos@test.com', contrasena: 'incorrecta' } };
    const res = mockRes();

    await medicoController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('devuelve el token y los datos del médico si las credenciales son correctas', async () => {
    const medico = {
      id: 2,
      nombre: 'Carlos',
      apellido: 'Gómez',
      mail: 'carlos@test.com',
      contrasena: 'hash-guardado',
      verificado: true,
    };
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue(medico);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    vi.spyOn(jwt, 'sign').mockReturnValue('token-simulado');
    const req = { body: { mail: medico.mail, contrasena: 'secreta123' } };
    const res = mockRes();

    await medicoController.login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      token: 'token-simulado',
      medico: {
        id: medico.id,
        nombre: medico.nombre,
        apellido: medico.apellido,
        mail: medico.mail,
        verificado: medico.verificado,
      },
    });
  });

  it('devuelve 500 si ocurre un error inesperado', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockRejectedValue(new Error('fallo de conexión'));
    const req = { body: { mail: 'carlos@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await medicoController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('perfil', () => {
  it('devuelve 404 si el médico no existe', async () => {
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 99 } };
    const res = mockRes();

    await medicoController.perfil(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve los datos del médico', async () => {
    const medico = { id: 2, nombre: 'Carlos' };
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue(medico);
    const req = { usuario: { id: 2 } };
    const res = mockRes();

    await medicoController.perfil(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medico });
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import adminModel from '../models/adminModel.js';
import adminController from './adminController.js';

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
    const req = { body: { mail: 'ana@test.com' } };
    const res = mockRes();

    await adminController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 401 si el admin no existe', async () => {
    vi.spyOn(adminModel, 'buscarPorMail').mockResolvedValue(null);
    const req = { body: { mail: 'ana@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await adminController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Credenciales inválidas.' });
  });

  it('devuelve 401 si la contraseña no coincide', async () => {
    vi.spyOn(adminModel, 'buscarPorMail').mockResolvedValue({ id: 1, contrasena: 'hash-guardado' });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    const req = { body: { mail: 'ana@test.com', contrasena: 'incorrecta' } };
    const res = mockRes();

    await adminController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('devuelve el token y los datos del admin si las credenciales son correctas', async () => {
    const admin = {
      id: 1,
      nombre: 'Ana',
      apellido: 'Ríos',
      mail: 'ana@test.com',
      contrasena: 'hash-guardado',
      verificado: true,
    };
    vi.spyOn(adminModel, 'buscarPorMail').mockResolvedValue(admin);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    vi.spyOn(jwt, 'sign').mockReturnValue('token-simulado');
    const req = { body: { mail: admin.mail, contrasena: 'secreta123' } };
    const res = mockRes();

    await adminController.login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      token: 'token-simulado',
      admin: {
        id: admin.id,
        nombre: admin.nombre,
        apellido: admin.apellido,
        mail: admin.mail,
        verificado: admin.verificado,
      },
    });
  });

  it('devuelve 500 si ocurre un error inesperado', async () => {
    vi.spyOn(adminModel, 'buscarPorMail').mockRejectedValue(new Error('fallo de conexión'));
    const req = { body: { mail: 'ana@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await adminController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('perfil', () => {
  it('devuelve 404 si el admin no existe', async () => {
    vi.spyOn(adminModel, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 99 } };
    const res = mockRes();

    await adminController.perfil(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve los datos del admin', async () => {
    const admin = { id: 1, nombre: 'Ana' };
    vi.spyOn(adminModel, 'buscarPorId').mockResolvedValue(admin);
    const req = { usuario: { id: 1 } };
    const res = mockRes();

    await adminController.perfil(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, admin });
  });
});

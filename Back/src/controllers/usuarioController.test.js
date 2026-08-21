import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import usuarioModel from '../models/usuarioModel.js';
import usuarioController from './usuarioController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

const datosRegistro = {
  nombre: 'Juana',
  apellido: 'Pérez',
  mail: 'juana@test.com',
  contrasena: 'secreta123',
  fechaNacimiento: '1990-01-01',
  dni: '12345678',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('registro', () => {
  it('devuelve 400 si faltan datos obligatorios', async () => {
    const spy = vi.spyOn(usuarioModel, 'buscarPorMail');
    const req = { body: { nombre: 'Juana' } };
    const res = mockRes();

    await usuarioController.registro(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('devuelve 409 si ya existe una cuenta con ese mail', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue({ id: 1 });
    const crearSpy = vi.spyOn(usuarioModel, 'crear');
    const req = { body: datosRegistro };
    const res = mockRes();

    await usuarioController.registro(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('crea el paciente con la contraseña hasheada y devuelve 201', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hash-simulado');
    const crearSpy = vi
      .spyOn(usuarioModel, 'crear')
      .mockResolvedValue({ id: 1, mail: datosRegistro.mail });
    const req = { body: datosRegistro };
    const res = mockRes();

    await usuarioController.registro(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith(datosRegistro.contrasena, 10);
    expect(crearSpy).toHaveBeenCalledWith(
      expect.objectContaining({ mail: datosRegistro.mail, contrasenaHash: 'hash-simulado' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, paciente: { id: 1, mail: datosRegistro.mail } });
  });

  it('devuelve 500 si ocurre un error inesperado', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockRejectedValue(new Error('fallo de conexión'));
    const req = { body: datosRegistro };
    const res = mockRes();

    await usuarioController.registro(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('login', () => {
  it('devuelve 400 si falta el mail o la contraseña', async () => {
    const req = { body: { mail: 'juana@test.com' } };
    const res = mockRes();

    await usuarioController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 401 si el paciente no existe', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(null);
    const req = { body: { mail: 'juana@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await usuarioController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Credenciales inválidas.' });
  });

  it('devuelve 401 si la contraseña no coincide', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue({ id: 1, contrasena: 'hash-guardado' });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    const req = { body: { mail: 'juana@test.com', contrasena: 'incorrecta' } };
    const res = mockRes();

    await usuarioController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('devuelve el token y los datos del paciente si las credenciales son correctas', async () => {
    const paciente = {
      id: 1,
      nombre: 'Juana',
      apellido: 'Pérez',
      mail: 'juana@test.com',
      contrasena: 'hash-guardado',
      verificado: true,
    };
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(paciente);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    vi.spyOn(jwt, 'sign').mockReturnValue('token-simulado');
    const req = { body: { mail: paciente.mail, contrasena: 'secreta123' } };
    const res = mockRes();

    await usuarioController.login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      token: 'token-simulado',
      paciente: {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        mail: paciente.mail,
        verificado: paciente.verificado,
      },
    });
  });
});

describe('perfil', () => {
  it('devuelve 404 si el paciente no existe', async () => {
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 99 } };
    const res = mockRes();

    await usuarioController.perfil(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve los datos del paciente', async () => {
    const paciente = { id: 1, nombre: 'Juana' };
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue(paciente);
    const req = { usuario: { id: 1 } };
    const res = mockRes();

    await usuarioController.perfil(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, paciente });
  });
});

describe('listar', () => {
  it('devuelve la lista de pacientes', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana' }, { id: 2, nombre: 'Pedro' }];
    vi.spyOn(usuarioModel, 'listarTodos').mockResolvedValue(pacientes);
    const req = {};
    const res = mockRes();

    await usuarioController.listar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, pacientes });
  });

  it('devuelve 500 si ocurre un error inesperado', async () => {
    vi.spyOn(usuarioModel, 'listarTodos').mockRejectedValue(new Error('fallo de conexión'));
    const req = {};
    const res = mockRes();

    await usuarioController.listar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

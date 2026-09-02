import { describe, it, expect, vi, afterEach } from 'vitest';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import medicoModel from '../models/medicoModel.js';
import usuarioModel from '../models/usuarioModel.js';
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

describe('registro', () => {
  it('devuelve 400 si faltan datos obligatorios', async () => {
    const req = { body: { nombre: 'Ana' } };
    const res = mockRes();

    await medicoController.registro(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 409 si ya existe una cuenta con ese mail', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue({ id: 1 });
    const req = {
      body: { nombre: 'Ana', apellido: 'Ruiz', mail: 'ana@test.com', contrasena: 'secreta123', dni: '30111222' },
    };
    const res = mockRes();

    await medicoController.registro(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('crea el médico como no verificado y devuelve 201', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(medicoModel, 'crear').mockResolvedValue({ id: 1, mail: 'ana@test.com', verificado: false });
    const req = {
      body: {
        nombre: 'Ana',
        apellido: 'Ruiz',
        mail: 'ana@test.com',
        contrasena: 'secreta123',
        dni: '30111222',
        matricula: 'MP-1',
      },
    };
    const res = mockRes();

    await medicoController.registro(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, medico: { id: 1, mail: 'ana@test.com', verificado: false } });
  });
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

  it('devuelve 403 si el médico todavía no fue aprobado', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue({ id: 2, contrasena: 'hash-guardado', verificado: false });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const req = { body: { mail: 'carlos@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await medicoController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('devuelve el token y los datos del médico si las credenciales son correctas y está verificado', async () => {
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

describe('listar', () => {
  it('devuelve sólo los médicos verificados para un médico', async () => {
    const medicos = [{ id: 1, verificado: true }];
    vi.spyOn(medicoModel, 'listarVerificados').mockResolvedValue(medicos);
    const req = { usuario: { id: 5, rol: 'medico' } };
    const res = mockRes();

    await medicoController.listar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos });
  });

  it('devuelve sólo los médicos verificados para un admin', async () => {
    const medicos = [{ id: 1, verificado: true }];
    vi.spyOn(medicoModel, 'listarVerificados').mockResolvedValue(medicos);
    const req = { usuario: { id: 1, rol: 'admin' } };
    const res = mockRes();

    await medicoController.listar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos });
  });

  it('devuelve solo el médico asignado cuando lo pide un paciente', async () => {
    const medico = { id: 2, nombre: 'Laura' };
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue(medico);
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await medicoController.listar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos: [medico] });
  });

  it('devuelve un array vacío si el paciente todavía no tiene médico asignado', async () => {
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: null });
    const buscarMedicoSpy = vi.spyOn(medicoModel, 'buscarPorId');
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await medicoController.listar(req, res);

    expect(buscarMedicoSpy).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos: [] });
  });
});

describe('pendientes', () => {
  it('devuelve los médicos sin aprobar', async () => {
    const medicos = [{ id: 2, verificado: false }];
    vi.spyOn(medicoModel, 'listarPendientes').mockResolvedValue(medicos);
    const req = {};
    const res = mockRes();

    await medicoController.pendientes(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos });
  });
});

describe('aprobar', () => {
  it('devuelve 404 si el médico no existe', async () => {
    vi.spyOn(medicoModel, 'aprobar').mockResolvedValue(null);
    const req = { params: { id: '99' } };
    const res = mockRes();

    await medicoController.aprobar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve el médico aprobado', async () => {
    const medico = { id: 2, verificado: true };
    vi.spyOn(medicoModel, 'aprobar').mockResolvedValue(medico);
    const req = { params: { id: '2' } };
    const res = mockRes();

    await medicoController.aprobar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medico });
  });
});

describe('eliminar', () => {
  it('devuelve 404 si el médico no existe', async () => {
    vi.spyOn(medicoModel, 'eliminar').mockResolvedValue(false);
    const req = { params: { id: '99' } };
    const res = mockRes();

    await medicoController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve ok si lo borró', async () => {
    vi.spyOn(medicoModel, 'eliminar').mockResolvedValue(true);
    const req = { params: { id: '2' } };
    const res = mockRes();

    await medicoController.eliminar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import usuarioModel from '../models/usuarioModel.js';
import env from '../config/env.js';
import app from '../app.js';

function token(rol, id) {
  return jwt.sign({ id, mail: `${rol}${id}@test.com`, rol }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/usuarios/registro', () => {
  it('devuelve 400 si faltan datos obligatorios', async () => {
    const res = await request(app).post('/api/usuarios/registro').send({ nombre: 'Juana' });

    expect(res.status).toBe(400);
  });

  it('crea el paciente y devuelve 201', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(usuarioModel, 'crear').mockResolvedValue({ id: 1, mail: 'juana@test.com' });

    const res = await request(app).post('/api/usuarios/registro').send({
      nombre: 'Juana',
      apellido: 'Pérez',
      mail: 'juana@test.com',
      contrasena: 'secreta123',
      fechaNacimiento: '1990-01-01',
      dni: '12345678',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, paciente: { id: 1, mail: 'juana@test.com' } });
  });
});

describe('POST /api/usuarios/login', () => {
  it('devuelve 401 con credenciales inválidas', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/usuarios/login')
      .send({ mail: 'juana@test.com', contrasena: 'secreta123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/usuarios/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/usuarios/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const paciente = { id: 1, nombre: 'Juana', mail: 'juana@test.com' };
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue(paciente);
    const token = jwt.sign({ id: 1, mail: paciente.mail, rol: 'paciente' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/api/usuarios/perfil').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, paciente });
  });
});

describe('GET /api/usuarios', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/usuarios');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si el token es de un paciente', async () => {
    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve la lista de pacientes para un médico', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana' }, { id: 2, nombre: 'Pedro' }];
    vi.spyOn(usuarioModel, 'listarTodos').mockResolvedValue(pacientes);

    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, pacientes });
  });
});

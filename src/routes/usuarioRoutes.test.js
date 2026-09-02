import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import env from '../config/env.js';
import app from '../server.js';

function token(rol, id) {
  return jwt.sign({ id, mail: `${rol}${id}@test.com`, rol }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /usuarios/registro', () => {
  it('devuelve 400 si faltan datos obligatorios', async () => {
    const res = await request(app).post('/usuarios/registro').send({ nombre: 'Juana' });

    expect(res.status).toBe(400);
  });

  it('crea el paciente y devuelve 201', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(usuarioModel, 'crear').mockResolvedValue({ id: 1, mail: 'juana@test.com' });

    const res = await request(app).post('/usuarios/registro').send({
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

describe('POST /usuarios/login', () => {
  it('devuelve 401 con credenciales inválidas', async () => {
    vi.spyOn(usuarioModel, 'buscarPorMail').mockResolvedValue(null);

    const res = await request(app)
      .post('/usuarios/login')
      .send({ mail: 'juana@test.com', contrasena: 'secreta123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /usuarios/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/usuarios/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const paciente = { id: 1, nombre: 'Juana', mail: 'juana@test.com' };
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue(paciente);
    const token = jwt.sign({ id: 1, mail: paciente.mail, rol: 'paciente' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/usuarios/perfil').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, paciente });
  });
});

describe('GET /usuarios', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/usuarios');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si el token es de un paciente', async () => {
    const res = await request(app).get('/usuarios').set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve la lista de pacientes para un médico', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana', medico_id: 2 }];
    vi.spyOn(usuarioModel, 'listarPorMedico').mockResolvedValue(pacientes);

    const res = await request(app).get('/usuarios').set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, pacientes });
  });

  it('devuelve la lista de pacientes para un admin', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana' }, { id: 2, nombre: 'Pedro' }];
    vi.spyOn(usuarioModel, 'listarTodos').mockResolvedValue(pacientes);

    const res = await request(app).get('/usuarios').set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, pacientes });
  });
});

describe('PUT /usuarios/:id/medico', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).put('/usuarios/1/medico').send({ medicoId: 2 });

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si el token no es de un admin', async () => {
    const res = await request(app)
      .put('/usuarios/1/medico')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ medicoId: 2 });

    expect(res.status).toBe(403);
  });

  it('asigna el médico y devuelve el paciente actualizado para un admin', async () => {
    const paciente = { id: 1, nombre: 'Juana', medico_id: 2 };
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue({ id: 2 });
    vi.spyOn(usuarioModel, 'asignarMedico').mockResolvedValue(paciente);

    const res = await request(app)
      .put('/usuarios/1/medico')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ medicoId: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, paciente });
  });
});

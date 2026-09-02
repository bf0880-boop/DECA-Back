import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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

describe('POST /medicos/registro', () => {
  it('devuelve 400 si faltan datos obligatorios', async () => {
    const res = await request(app).post('/medicos/registro').send({ nombre: 'Ana' });

    expect(res.status).toBe(400);
  });

  it('crea el médico como no verificado y devuelve 201', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(medicoModel, 'crear').mockResolvedValue({ id: 1, mail: 'ana@test.com', verificado: false });

    const res = await request(app).post('/medicos/registro').send({
      nombre: 'Ana',
      apellido: 'Ruiz',
      mail: 'ana@test.com',
      contrasena: 'secreta123',
      dni: '30111222',
      matricula: 'MP-1',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, medico: { id: 1, mail: 'ana@test.com', verificado: false } });
  });
});

describe('POST /medicos/login', () => {
  it('devuelve 401 con credenciales inválidas', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue(null);

    const res = await request(app)
      .post('/medicos/login')
      .send({ mail: 'carlos@test.com', contrasena: 'secreta123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /medicos/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/medicos/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const medico = { id: 2, nombre: 'Carlos', mail: 'carlos@test.com' };
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue(medico);
    const t = jwt.sign({ id: 2, mail: medico.mail, rol: 'medico' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/medicos/perfil').set('Authorization', `Bearer ${t}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medico });
  });
});

describe('GET /medicos', () => {
  it('devuelve la lista de médicos verificados', async () => {
    const medicos = [{ id: 1, nombre: 'Carlos', verificado: true }];
    vi.spyOn(medicoModel, 'listarVerificados').mockResolvedValue(medicos);

    const res = await request(app).get('/medicos').set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medicos });
  });
});

describe('GET /medicos/pendientes', () => {
  it('devuelve 403 si no es admin', async () => {
    const res = await request(app)
      .get('/medicos/pendientes')
      .set('Authorization', `Bearer ${token('medico', 1)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve la lista de médicos pendientes para un admin', async () => {
    const medicos = [{ id: 2, nombre: 'Ana', verificado: false }];
    vi.spyOn(medicoModel, 'listarPendientes').mockResolvedValue(medicos);

    const res = await request(app)
      .get('/medicos/pendientes')
      .set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medicos });
  });
});

describe('PUT /medicos/:id/aprobar', () => {
  it('devuelve 403 si no es admin', async () => {
    const res = await request(app)
      .put('/medicos/2/aprobar')
      .set('Authorization', `Bearer ${token('medico', 1)}`);

    expect(res.status).toBe(403);
  });

  it('aprueba el médico para un admin', async () => {
    const medico = { id: 2, verificado: true };
    vi.spyOn(medicoModel, 'aprobar').mockResolvedValue(medico);

    const res = await request(app)
      .put('/medicos/2/aprobar')
      .set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medico });
  });
});

describe('DELETE /medicos/:id', () => {
  it('devuelve 403 si no es admin', async () => {
    const res = await request(app)
      .delete('/medicos/2')
      .set('Authorization', `Bearer ${token('medico', 1)}`);

    expect(res.status).toBe(403);
  });

  it('elimina el médico para un admin', async () => {
    vi.spyOn(medicoModel, 'eliminar').mockResolvedValue(true);

    const res = await request(app)
      .delete('/medicos/2')
      .set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

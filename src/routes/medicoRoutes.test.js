import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import medicoModel from '../models/medicoModel.js';
import env from '../config/env.js';
import app from '../app.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/medicos/login', () => {
  it('devuelve 401 con credenciales inválidas', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/medicos/login')
      .send({ mail: 'carlos@test.com', contrasena: 'secreta123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/medicos/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/medicos/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const medico = { id: 2, nombre: 'Carlos', mail: 'carlos@test.com' };
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue(medico);
    const token = jwt.sign({ id: 2, mail: medico.mail, rol: 'medico' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/api/medicos/perfil').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medico });
  });
});

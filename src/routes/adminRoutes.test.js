import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import adminModel from '../models/adminModel.js';
import env from '../config/env.js';
import app from '../server.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/admins/login', () => {
  it('devuelve 401 con credenciales inválidas', async () => {
    vi.spyOn(adminModel, 'buscarPorMail').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/admins/login')
      .send({ mail: 'ana@test.com', contrasena: 'secreta123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/admins/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/admins/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const admin = { id: 1, nombre: 'Ana', mail: 'ana@test.com' };
    vi.spyOn(adminModel, 'buscarPorId').mockResolvedValue(admin);
    const token = jwt.sign({ id: 1, mail: admin.mail, rol: 'admin' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/api/admins/perfil').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, admin });
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import adminService from '../services/adminService.js';
import env from '../config/env.js';
import app from '../server.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /admins/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/admins/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const admin = { id: 1, nombre: 'Ana', mail: 'ana@test.com' };
    vi.spyOn(adminService, 'buscarPorId').mockResolvedValue(admin);
    const token = jwt.sign({ id: 1, mail: admin.mail, rol: 'admin' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/admins/perfil').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, admin });
  });
});

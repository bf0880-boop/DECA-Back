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

  it('devuelve 403 si el token no es de un admin', async () => {
    const token = jwt.sign({ id: 1, mail: 'p@test.com', rol: 'paciente' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/admins/perfil').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

describe('PUT /admins/perfil', () => {
  const tokenDe = (rol) => jwt.sign({ id: 1, mail: 'x@test.com', rol }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

  it('devuelve 403 si el token no es de un admin', async () => {
    const res = await request(app)
      .put('/admins/perfil')
      .set('Authorization', `Bearer ${tokenDe('paciente')}`)
      .send({ nombre: 'Ana', apellido: 'López' });

    expect(res.status).toBe(403);
  });

  it('devuelve 400 si falta el nombre', async () => {
    const res = await request(app)
      .put('/admins/perfil')
      .set('Authorization', `Bearer ${tokenDe('admin')}`)
      .send({ nombre: ' ', apellido: 'López' });

    expect(res.status).toBe(400);
  });

  it('actualiza nombre y apellido, ignorando el mail', async () => {
    const admin = { id: 1, nombre: 'Ana', apellido: 'López', mail: 'ana@test.com' };
    const spy = vi.spyOn(adminService, 'actualizarPerfil').mockResolvedValue(admin);

    const res = await request(app)
      .put('/admins/perfil')
      .set('Authorization', `Bearer ${tokenDe('admin')}`)
      .send({ nombre: 'Ana', apellido: 'López', mail: 'otro@test.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, admin });
    expect(spy).toHaveBeenCalledWith(1, { nombre: 'Ana', apellido: 'López' });
  });
});

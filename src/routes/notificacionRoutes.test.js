import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import notificacionModel from '../models/notificacionModel.js';
import env from '../config/env.js';
import app from '../server.js';

function token(rol, id) {
  return jwt.sign({ id, mail: `${rol}${id}@test.com`, rol }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

const notificacion = {
  id: 3,
  usuario_tipo: 'medico',
  usuario_id: 2,
  contenido: 'Juana Pérez te envió un mensaje',
  leida: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/notificaciones', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/notificaciones');

    expect(res.status).toBe(401);
  });

  it('devuelve las notificaciones del usuario logueado', async () => {
    vi.spyOn(notificacionModel, 'listarPorUsuario').mockResolvedValue([notificacion]);

    const res = await request(app)
      .get('/api/notificaciones')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, notificaciones: [notificacion] });
    expect(notificacionModel.listarPorUsuario).toHaveBeenCalledWith('medico', 2);
  });
});

describe('PUT /api/notificaciones/:id/leida', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).put('/api/notificaciones/3/leida');

    expect(res.status).toBe(401);
  });

  it('devuelve 404 si la notificación no existe o no es del usuario', async () => {
    vi.spyOn(notificacionModel, 'marcarLeida').mockResolvedValue(null);

    const res = await request(app)
      .put('/api/notificaciones/3/leida')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(404);
  });

  it('marca la notificación como leída y devuelve 200', async () => {
    const leida = { ...notificacion, leida: true };
    vi.spyOn(notificacionModel, 'marcarLeida').mockResolvedValue(leida);

    const res = await request(app)
      .put('/api/notificaciones/3/leida')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, notificacion: leida });
    expect(notificacionModel.marcarLeida).toHaveBeenCalledWith('3', 'medico', 2);
  });
});

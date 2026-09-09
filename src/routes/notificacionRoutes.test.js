import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

import notificacionModel from '../models/notificacionModel.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import adminModel from '../models/adminModel.js';
import app from '../server.js';

vi.mock('../config/auth.js', () => ({
  auth: {
    api: {
      // Simula la sesión de Better Auth a partir de un bearer "rol:id" armado
      // por el helper token() de este archivo, sin pasar por una base real.
      getSession: vi.fn(async ({ headers }) => {
        const match = headers.get('authorization')?.match(/^Bearer (\w+):(\d+)$/);
        if (!match) return null;
        const [, rol, id] = match;
        return { user: { id, role: rol, email: `${rol}${id}@test.com` } };
      }),
    },
  },
}));

function token(rol, id) {
  return `${rol}:${id}`;
}

const notificacion = {
  id: 3,
  usuario_tipo: 'medico',
  usuario_id: 2,
  contenido: 'Juana Pérez te envió un mensaje',
  leida: false,
};

beforeEach(() => {
  // El middleware busca el perfil por auth_user_id; en los tests ese id es
  // directamente el id numérico que llevó el token, para no duplicar mocks.
  vi.spyOn(usuarioModel, 'buscarPorAuthUserId').mockImplementation(async (id) => ({ id: Number(id) }));
  vi.spyOn(medicoModel, 'buscarPorAuthUserId').mockImplementation(async (id) => ({ id: Number(id) }));
  vi.spyOn(adminModel, 'buscarPorAuthUserId').mockImplementation(async (id) => ({ id: Number(id) }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /notificaciones', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/notificaciones');

    expect(res.status).toBe(401);
  });

  it('devuelve las notificaciones del usuario logueado', async () => {
    vi.spyOn(notificacionModel, 'listarPorUsuario').mockResolvedValue([notificacion]);

    const res = await request(app)
      .get('/notificaciones')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, notificaciones: [notificacion] });
    expect(notificacionModel.listarPorUsuario).toHaveBeenCalledWith('medico', 2);
  });
});

describe('PUT /notificaciones/:id/leida', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).put('/notificaciones/3/leida');

    expect(res.status).toBe(401);
  });

  it('devuelve 404 si la notificación no existe o no es del usuario', async () => {
    vi.spyOn(notificacionModel, 'marcarLeida').mockResolvedValue(null);

    const res = await request(app)
      .put('/notificaciones/3/leida')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(404);
  });

  it('marca la notificación como leída y devuelve 200', async () => {
    const leida = { ...notificacion, leida: true };
    vi.spyOn(notificacionModel, 'marcarLeida').mockResolvedValue(leida);

    const res = await request(app)
      .put('/notificaciones/3/leida')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, notificacion: leida });
    expect(notificacionModel.marcarLeida).toHaveBeenCalledWith('3', 'medico', 2);
  });
});

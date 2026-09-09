import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

import adminModel from '../models/adminModel.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import app from '../server.js';

vi.mock('../config/auth.js', () => ({
  auth: {
    api: {
      signInEmail: vi.fn(),
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
  enviarCodigoDeVerificacion: vi.fn(),
  esErrorMailNoVerificado: vi.fn(() => false),
}));

function token(rol, id) {
  return `${rol}:${id}`;
}

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

describe('POST /admins/login', () => {
  it('devuelve 401 con credenciales inválidas', async () => {
    vi.spyOn(adminModel, 'buscarPorMail').mockResolvedValue(null);

    const res = await request(app)
      .post('/admins/login')
      .send({ mail: 'ana@test.com', contrasena: 'secreta123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /admins/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/admins/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const admin = { id: 1, nombre: 'Ana', mail: 'ana@test.com' };
    vi.spyOn(adminModel, 'buscarPorId').mockResolvedValue(admin);

    const res = await request(app)
      .get('/admins/perfil')
      .set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, admin });
  });
});

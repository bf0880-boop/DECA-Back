import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

import { auth } from '../config/auth.js';
import medicoModel from '../models/medicoModel.js';
import usuarioModel from '../models/usuarioModel.js';
import adminModel from '../models/adminModel.js';
import app from '../server.js';

vi.mock('../config/auth.js', () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
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
  eliminarUsuarioAuth: vi.fn(),
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

describe('POST /medicos/registro', () => {
  it('devuelve 400 si faltan datos obligatorios', async () => {
    const res = await request(app).post('/medicos/registro').send({ nombre: 'Ana' });

    expect(res.status).toBe(400);
  });

  it('crea el médico como no verificado y devuelve 201', async () => {
    vi.spyOn(medicoModel, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(medicoModel, 'crear').mockResolvedValue({ id: 1, mail: 'ana@test.com', verificado: false });
    auth.api.signUpEmail.mockResolvedValue({ user: { id: 'auth-1' } });

    const res = await request(app).post('/medicos/registro').send({
      nombre: 'Ana',
      apellido: 'Ruiz',
      mail: 'ana@test.com',
      contrasena: 'secreta123',
      dni: '30111222',
      matricula: 'MP-1',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({ ok: true, medico: { id: 1, mail: 'ana@test.com', verificado: false } })
    );
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

    const res = await request(app)
      .get('/medicos/perfil')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medico });
  });
});

describe('GET /medicos', () => {
  it('devuelve la lista de médicos verificados para un admin', async () => {
    const medicos = [{ id: 1, nombre: 'Carlos', verificado: true }];
    vi.spyOn(medicoModel, 'listarVerificados').mockResolvedValue(medicos);

    const res = await request(app).get('/medicos').set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medicos });
  });

  it('devuelve solo el médico asignado cuando lo pide un paciente', async () => {
    const medico = { id: 2, nombre: 'Carlos', verificado: true };
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue(medico);

    const res = await request(app).get('/medicos').set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medicos: [medico] });
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

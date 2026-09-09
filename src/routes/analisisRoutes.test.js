import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

import analisisModel from '../models/analisisModel.js';
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

const analisis = {
  id: 5,
  paciente_id: 1,
  porcentaje: 42.5,
  fecha_hora_entrega: '2026-08-18T10:00:00.000',
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

describe('POST /analisis', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/analisis').send({ pacienteId: 1, porcentaje: 42.5 });

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si lo intenta un paciente', async () => {
    const res = await request(app)
      .post('/analisis')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ pacienteId: 1, porcentaje: 42.5 });

    expect(res.status).toBe(403);
  });

  it('devuelve 400 si faltan datos', async () => {
    const res = await request(app)
      .post('/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ pacienteId: 1 });

    expect(res.status).toBe(400);
  });

  it('devuelve 403 si el paciente no está asignado al médico', async () => {
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });

    const res = await request(app)
      .post('/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ pacienteId: 1, porcentaje: 42.5 });

    expect(res.status).toBe(403);
  });

  it('devuelve 404 si el paciente no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ id: 999, medico_id: 2 });
    vi.spyOn(analisisModel, 'crear').mockRejectedValue(error);

    const res = await request(app)
      .post('/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ pacienteId: 999, porcentaje: 42.5 });

    expect(res.status).toBe(404);
  });

  it('el médico realiza el análisis, se notifica al paciente y devuelve 201', async () => {
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(analisisModel, 'crear').mockResolvedValue(analisis);
    vi.spyOn(notificacionModel, 'crear').mockResolvedValue({});

    const res = await request(app)
      .post('/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ pacienteId: 1, porcentaje: 42.5 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, analisis });
    expect(analisisModel.crear).toHaveBeenCalledWith({ pacienteId: 1, porcentaje: 42.5 });
    expect(notificacionModel.crear).toHaveBeenCalledWith({
      usuarioTipo: 'paciente',
      usuarioId: 1,
      contenido: 'Recibiste un nuevo análisis.',
    });
  });
});

describe('GET /analisis', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/analisis');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si lo intenta un médico', async () => {
    const res = await request(app)
      .get('/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve los análisis del paciente logueado', async () => {
    vi.spyOn(analisisModel, 'listarPorPaciente').mockResolvedValue([analisis]);

    const res = await request(app)
      .get('/analisis')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, analisis: [analisis] });
    expect(analisisModel.listarPorPaciente).toHaveBeenCalledWith(1);
  });
});

describe('GET /analisis/:pacienteId', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/analisis/1');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si lo intenta un paciente', async () => {
    const res = await request(app)
      .get('/analisis/1')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve 403 si el paciente no está asignado al médico', async () => {
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });

    const res = await request(app)
      .get('/analisis/1')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve los análisis del paciente indicado', async () => {
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(analisisModel, 'listarPorPaciente').mockResolvedValue([analisis]);

    const res = await request(app)
      .get('/analisis/1')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, analisis: [analisis] });
    expect(analisisModel.listarPorPaciente).toHaveBeenCalledWith('1');
  });
});

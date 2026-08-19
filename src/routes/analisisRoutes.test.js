import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import analisisModel from '../models/analisisModel.js';
import notificacionModel from '../models/notificacionModel.js';
import env from '../config/env.js';
import app from '../app.js';

function token(rol, id) {
  return jwt.sign({ id, mail: `${rol}${id}@test.com`, rol }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

const analisis = {
  id: 5,
  paciente_id: 1,
  porcentaje: 42.5,
  fecha_hora_entrega: '2026-08-18T10:00:00.000',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/analisis', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/api/analisis').send({ pacienteId: 1, porcentaje: 42.5 });

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si lo intenta un paciente', async () => {
    const res = await request(app)
      .post('/api/analisis')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ pacienteId: 1, porcentaje: 42.5 });

    expect(res.status).toBe(403);
  });

  it('devuelve 400 si faltan datos', async () => {
    const res = await request(app)
      .post('/api/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ pacienteId: 1 });

    expect(res.status).toBe(400);
  });

  it('devuelve 404 si el paciente no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(analisisModel, 'crear').mockRejectedValue(error);

    const res = await request(app)
      .post('/api/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ pacienteId: 999, porcentaje: 42.5 });

    expect(res.status).toBe(404);
  });

  it('el médico realiza el análisis, se notifica al paciente y devuelve 201', async () => {
    vi.spyOn(analisisModel, 'crear').mockResolvedValue(analisis);
    vi.spyOn(notificacionModel, 'crear').mockResolvedValue({});

    const res = await request(app)
      .post('/api/analisis')
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

describe('GET /api/analisis', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/analisis');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si lo intenta un médico', async () => {
    const res = await request(app)
      .get('/api/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve los análisis del paciente logueado', async () => {
    vi.spyOn(analisisModel, 'listarPorPaciente').mockResolvedValue([analisis]);

    const res = await request(app)
      .get('/api/analisis')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, analisis: [analisis] });
    expect(analisisModel.listarPorPaciente).toHaveBeenCalledWith(1);
  });
});

describe('GET /api/analisis/:pacienteId', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/analisis/1');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si lo intenta un paciente', async () => {
    const res = await request(app)
      .get('/api/analisis/1')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve los análisis del paciente indicado', async () => {
    vi.spyOn(analisisModel, 'listarPorPaciente').mockResolvedValue([analisis]);

    const res = await request(app)
      .get('/api/analisis/1')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, analisis: [analisis] });
    expect(analisisModel.listarPorPaciente).toHaveBeenCalledWith('1');
  });
});

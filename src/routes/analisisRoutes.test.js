import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import analisisService from '../services/analisisService.js';
import inferenciaService from '../services/inferenciaService.js';
import notificacionService from '../services/notificacionService.js';
import usuarioService from '../services/usuarioService.js';
import env from '../config/env.js';
import app from '../server.js';

function token(rol, id) {
  return jwt.sign({ id, mail: `${rol}${id}@test.com`, rol }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

const analisis = {
  id: 5,
  paciente_id: 1,
  porcentaje: 98.7,
  banda: 'alta',
  score: 0.961234,
  modelo_sha: 'b0e2ecfc838e169c',
  fecha_hora_entrega: '2026-08-18T10:00:00.000',
};

const resultadoInferencia = {
  percentil: 98.7,
  banda: 'alta',
  score: 0.961234,
  interpretacion: { texto: '…', ppv: 0.2953 },
  calidad: { duracion_recibida_s: 10 },
  modelo: { sha256: 'b0e2ecfc838e169c' },
};

const ecg = Buffer.from('I,II,III\n0,0,0\n');

function postAnalisis(auth, pacienteId = '1') {
  const req = request(app).post('/analisis');
  if (auth) req.set('Authorization', `Bearer ${auth}`);
  return req
    .field('pacienteId', pacienteId)
    .field('frecuencia', '500')
    .attach('archivo', ecg, 'ecg.csv');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /analisis', () => {
  it('devuelve 401 sin token', async () => {
    const res = await postAnalisis(null);

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si lo intenta un paciente', async () => {
    const res = await postAnalisis(token('paciente', 1));

    expect(res.status).toBe(403);
  });

  it('devuelve 400 si falta el archivo', async () => {
    const res = await request(app)
      .post('/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .field('pacienteId', '1')
      .field('frecuencia', '500');

    expect(res.status).toBe(400);
  });

  it('devuelve 413 si el archivo supera el límite', async () => {
    const res = await request(app)
      .post('/analisis')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .field('pacienteId', '1')
      .attach('archivo', Buffer.alloc(9 * 1024 * 1024), 'ecg.csv');

    expect(res.status).toBe(413);
  });

  it('devuelve 403 si el paciente no está asignado al médico', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });

    const res = await postAnalisis(token('medico', 2));

    expect(res.status).toBe(403);
  });

  it('devuelve 404 si el paciente no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 999, medico_id: 2 });
    vi.spyOn(inferenciaService, 'analizar').mockResolvedValue(resultadoInferencia);
    vi.spyOn(analisisService, 'crear').mockRejectedValue(error);

    const res = await postAnalisis(token('medico', 2), '999');

    expect(res.status).toBe(404);
  });

  it('el médico realiza el análisis, se notifica al paciente y devuelve 201', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(inferenciaService, 'analizar').mockResolvedValue(resultadoInferencia);
    vi.spyOn(analisisService, 'crear').mockResolvedValue(analisis);
    vi.spyOn(notificacionService, 'crear').mockResolvedValue({});

    const res = await postAnalisis(token('medico', 2));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      ok: true,
      analisis,
      interpretacion: resultadoInferencia.interpretacion,
      calidad: resultadoInferencia.calidad,
    });
    expect(inferenciaService.analizar).toHaveBeenCalledWith({
      buffer: ecg,
      nombreArchivo: 'ecg.csv',
      frecuencia: '500',
      derivaciones: undefined,
    });
    expect(analisisService.crear).toHaveBeenCalledWith({
      pacienteId: '1',
      porcentaje: 98.7,
      banda: 'alta',
      score: 0.961234,
      modeloSha: 'b0e2ecfc838e169c',
    });
    expect(notificacionService.crear).toHaveBeenCalledWith({
      usuarioTipo: 'paciente',
      usuarioId: '1',
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
    vi.spyOn(analisisService, 'listarPorPaciente').mockResolvedValue([analisis]);

    const res = await request(app)
      .get('/analisis')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, analisis: [analisis] });
    expect(analisisService.listarPorPaciente).toHaveBeenCalledWith(1);
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
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });

    const res = await request(app)
      .get('/analisis/1')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve los análisis del paciente indicado', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(analisisService, 'listarPorPaciente').mockResolvedValue([analisis]);

    const res = await request(app)
      .get('/analisis/1')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, analisis: [analisis] });
    expect(analisisService.listarPorPaciente).toHaveBeenCalledWith('1');
  });
});

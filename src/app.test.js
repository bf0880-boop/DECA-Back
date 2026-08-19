import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';

import pool from './config/db.js';
import app from './app.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /health/db', () => {
  it('devuelve la hora de la base si la conexión funciona', async () => {
    const now = '2026-08-12T10:00:00.000Z';
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ now }] });

    const res = await request(app).get('/health/db');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, dbTime: now });
    expect(pool.query).toHaveBeenCalledWith('SELECT NOW() AS now');
  });

  it('devuelve 500 si la base no responde', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('fallo de conexión'));

    const res = await request(app).get('/health/db');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, error: 'fallo de conexión' });
  });
});

describe('app', () => {
  it('devuelve 404 en una ruta que no existe', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
  });

  it('parsea el body en JSON', async () => {
    const res = await request(app)
      .post('/api/usuarios/registro')
      .set('Content-Type', 'application/json')
      .send({ nombre: 'Juana' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, error: 'Faltan datos obligatorios.' });
  });

  it('habilita CORS para el frontend', async () => {
    const res = await request(app).get('/api/notificaciones');

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

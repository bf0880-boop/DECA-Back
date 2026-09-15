import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';

import oauthVerifier from '../services/oauthVerifier.js';
import app from '../server.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /auth/:provider', () => {
  it('devuelve 400 si el proveedor no está soportado', async () => {
    const res = await request(app).post('/auth/facebook').send({ credential: 'x' });

    expect(res.status).toBe(400);
  });

  it('devuelve 400 si falta el credential', async () => {
    const res = await request(app).post('/auth/google').send({});

    expect(res.status).toBe(400);
  });

  it('devuelve 401 si el token no es válido', async () => {
    vi.spyOn(oauthVerifier, 'verifyIdToken').mockRejectedValue(new Error('firma inválida'));

    const res = await request(app).post('/auth/google').send({ credential: 'malo' });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/completar-registro', () => {
  it('devuelve 401 si el regToken es inválido', async () => {
    const res = await request(app)
      .post('/auth/completar-registro')
      .send({ regToken: 'invalido', role: 'paciente', dni: '1', fechaNacimiento: '1990-01-01' });

    expect(res.status).toBe(401);
  });
});

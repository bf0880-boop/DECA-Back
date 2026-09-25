import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

import oauthVerifier from '../services/oauthVerifier.js';
import usuarioService from '../services/usuarioService.js';
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

describe('POST /auth/login', () => {
  it('no se confunde con un proveedor OAuth y devuelve 400 si faltan datos', async () => {
    const res = await request(app).post('/auth/login').send({ mail: 'juana@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Mail y contraseña son obligatorios.');
  });

  it('devuelve el token si la contraseña coincide', async () => {
    const contrasena = bcrypt.hashSync('secreta123', 4);
    vi.spyOn(usuarioService, 'buscarPorMail').mockResolvedValue({ id: 1, mail: 'juana@test.com', contrasena });

    const res = await request(app).post('/auth/login').send({ mail: 'juana@test.com', contrasena: 'secreta123' });

    expect(res.status).toBe(200);
    expect(res.body.rol).toBe('paciente');
    expect(res.body.token).toBeTruthy();
    expect(res.body.paciente.contrasena).toBeUndefined();
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

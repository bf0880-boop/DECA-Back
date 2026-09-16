import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import usuarioService from '../services/usuarioService.js';
import medicoService from '../services/medicoService.js';
import env from '../config/env.js';
import app from '../server.js';

function token(rol, id) {
  return jwt.sign({ id, mail: `${rol}${id}@test.com`, rol }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /usuarios/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/usuarios/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const paciente = { id: 1, nombre: 'Juana', mail: 'juana@test.com' };
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue(paciente);
    const token = jwt.sign({ id: 1, mail: paciente.mail, rol: 'paciente' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/usuarios/perfil').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, paciente });
  });
});

describe('GET /usuarios', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/usuarios');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si el token es de un paciente', async () => {
    const res = await request(app).get('/usuarios').set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve la lista de pacientes para un médico', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana', medico_id: 2 }];
    vi.spyOn(usuarioService, 'listarPorMedico').mockResolvedValue(pacientes);

    const res = await request(app).get('/usuarios').set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, pacientes });
  });

  it('devuelve la lista de pacientes para un admin', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana' }, { id: 2, nombre: 'Pedro' }];
    vi.spyOn(usuarioService, 'listarTodos').mockResolvedValue(pacientes);

    const res = await request(app).get('/usuarios').set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, pacientes });
  });
});

describe('PUT /usuarios/:id/medico', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).put('/usuarios/1/medico').send({ medicoId: 2 });

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si el token no es de un admin', async () => {
    const res = await request(app)
      .put('/usuarios/1/medico')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ medicoId: 2 });

    expect(res.status).toBe(403);
  });

  it('asigna el médico y devuelve el paciente actualizado para un admin', async () => {
    const paciente = { id: 1, nombre: 'Juana', medico_id: 2 };
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue({ id: 2 });
    vi.spyOn(usuarioService, 'asignarMedico').mockResolvedValue(paciente);

    const res = await request(app)
      .put('/usuarios/1/medico')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ medicoId: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, paciente });
  });
});

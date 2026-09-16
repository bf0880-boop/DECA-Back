import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import medicoService from '../services/medicoService.js';
import usuarioService from '../services/usuarioService.js';
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

describe('GET /medicos/perfil', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/medicos/perfil');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil con un token válido', async () => {
    const medico = { id: 2, nombre: 'Carlos', mail: 'carlos@test.com' };
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue(medico);
    const t = jwt.sign({ id: 2, mail: medico.mail, rol: 'medico' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    const res = await request(app).get('/medicos/perfil').set('Authorization', `Bearer ${t}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medico });
  });
});

describe('GET /medicos', () => {
  it('devuelve la lista de médicos verificados para un admin', async () => {
    const medicos = [{ id: 1, nombre: 'Carlos', verificado: true }];
    vi.spyOn(medicoService, 'listarVerificados').mockResolvedValue(medicos);

    const res = await request(app).get('/medicos').set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, medicos });
  });

  it('devuelve solo el médico asignado cuando lo pide un paciente', async () => {
    const medico = { id: 2, nombre: 'Carlos', verificado: true };
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue(medico);

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
    vi.spyOn(medicoService, 'listarPendientes').mockResolvedValue(medicos);

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
    vi.spyOn(medicoService, 'aprobar').mockResolvedValue(medico);

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
    vi.spyOn(medicoService, 'eliminar').mockResolvedValue(true);

    const res = await request(app)
      .delete('/medicos/2')
      .set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

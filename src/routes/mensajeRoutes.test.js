import { describe, it, expect, vi, afterEach } from 'vitest';
const request = require('supertest');
const jwt = require('jsonwebtoken');

const mensajeModel = require('../models/mensajeModel');
const env = require('../config/env');
const app = require('../app');

function token(rol, id) {
  return jwt.sign({ id, mail: `${rol}${id}@test.com`, rol }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

const mensajeDelPaciente = {
  id: 7,
  paciente_id: 1,
  medico_id: 2,
  emisor: 'paciente',
  contenido: 'Hola doctor',
  eliminado: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PATCH /api/mensajes/:id', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).patch('/api/mensajes/7').send({ contenido: 'Nuevo' });

    expect(res.status).toBe(401);
  });

  it('devuelve 400 si el contenido está vacío', async () => {
    const res = await request(app)
      .patch('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: '   ' });

    expect(res.status).toBe(400);
  });

  it('devuelve 404 si el mensaje no existe', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: 'Nuevo' });

    expect(res.status).toBe(404);
  });

  it('devuelve 404 si el usuario no participa de la conversación', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);

    const res = await request(app)
      .patch('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 99)}`)
      .send({ contenido: 'Nuevo' });

    expect(res.status).toBe(404);
  });

  it('devuelve 403 si el mensaje lo envió la contraparte', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);

    const res = await request(app)
      .patch('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ contenido: 'Nuevo' });

    expect(res.status).toBe(403);
  });

  it('devuelve 409 si el mensaje ya fue eliminado', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'editar').mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: 'Nuevo' });

    expect(res.status).toBe(409);
  });

  it('edita el mensaje propio y devuelve 200', async () => {
    const editado = { ...mensajeDelPaciente, contenido: 'Hola doctora', editado_en: '2026-08-12T10:00:00.000' };
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'editar').mockResolvedValue(editado);

    const res = await request(app)
      .patch('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: '  Hola doctora  ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, mensaje: editado });
    expect(mensajeModel.editar).toHaveBeenCalledWith(7, 'Hola doctora');
  });
});

describe('DELETE /api/mensajes/:id', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).delete('/api/mensajes/7');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si el mensaje lo envió la contraparte', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);

    const res = await request(app)
      .delete('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve 409 si el mensaje ya estaba eliminado', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'eliminar').mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(409);
  });

  it('elimina el mensaje propio y devuelve 200 sin contenido', async () => {
    const eliminado = {
      ...mensajeDelPaciente,
      contenido: null,
      eliminado: true,
      eliminado_en: '2026-08-12T10:00:00.000',
    };
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'eliminar').mockResolvedValue(eliminado);

    const res = await request(app)
      .delete('/api/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, mensaje: eliminado });
    expect(mensajeModel.eliminar).toHaveBeenCalledWith(7);
  });
});

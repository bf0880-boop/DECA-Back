import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import mensajeService from '../services/mensajeService.js';
import usuarioService from '../services/usuarioService.js';
import medicoService from '../services/medicoService.js';
import notificacionService from '../services/notificacionService.js';
import env from '../config/env.js';
import app from '../server.js';

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

describe('POST /mensajes', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/mensajes').send({ contenido: 'Hola', medicoId: 2 });

    expect(res.status).toBe(401);
  });

  it('devuelve 400 si falta el destinatario', async () => {
    const res = await request(app)
      .post('/mensajes')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: 'Hola' });

    expect(res.status).toBe(400);
  });

  it('devuelve 400 si el contenido está vacío', async () => {
    const res = await request(app)
      .post('/mensajes')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: '   ', medicoId: 2 });

    expect(res.status).toBe(400);
  });

  it('devuelve 403 si el paciente y el médico no están asignados entre sí', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });

    const res = await request(app)
      .post('/mensajes')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: 'Hola', medicoId: 2 });

    expect(res.status).toBe(403);
  });

  it('devuelve 404 si el destinatario no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 999 });
    vi.spyOn(mensajeService, 'crear').mockRejectedValue(error);

    const res = await request(app)
      .post('/mensajes')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: 'Hola', medicoId: 999 });

    expect(res.status).toBe(404);
  });

  it('crea el mensaje, notifica al médico y devuelve 201', async () => {
    const creado = { ...mensajeDelPaciente, contenido: 'Hola doctor' };
    vi.spyOn(mensajeService, 'crear').mockResolvedValue(creado);
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ nombre: 'Juana', apellido: 'Pérez', medico_id: 2 });
    vi.spyOn(notificacionService, 'crear').mockResolvedValue({});

    const res = await request(app)
      .post('/mensajes')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: '  Hola doctor  ', medicoId: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, mensaje: creado });
    expect(mensajeService.crear).toHaveBeenCalledWith({
      pacienteId: 1,
      medicoId: 2,
      emisor: 'paciente',
      contenido: 'Hola doctor',
    });
    expect(notificacionService.crear).toHaveBeenCalledWith({
      usuarioTipo: 'medico',
      usuarioId: 2,
      contenido: 'Juana Pérez te envió un mensaje',
    });
  });

  it('notifica al paciente cuando el mensaje lo envía el médico', async () => {
    const creado = { ...mensajeDelPaciente, emisor: 'medico', contenido: 'Hola paciente' };
    vi.spyOn(mensajeService, 'crear').mockResolvedValue(creado);
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue({ nombre: 'Carlos', apellido: 'Gómez' });
    vi.spyOn(notificacionService, 'crear').mockResolvedValue({});

    const res = await request(app)
      .post('/mensajes')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ contenido: 'Hola paciente', pacienteId: 1 });

    expect(res.status).toBe(201);
    expect(notificacionService.crear).toHaveBeenCalledWith({
      usuarioTipo: 'paciente',
      usuarioId: 1,
      contenido: 'Carlos Gómez te envió un mensaje',
    });
  });

  it('no falla el envío aunque la notificación no se pueda crear', async () => {
    const creado = { ...mensajeDelPaciente, contenido: 'Hola doctor' };
    vi.spyOn(mensajeService, 'crear').mockResolvedValue(creado);
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ nombre: 'Juana', apellido: 'Pérez', medico_id: 2 });
    vi.spyOn(notificacionService, 'crear').mockRejectedValue(new Error('fallo de conexión'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/mensajes')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: 'Hola doctor', medicoId: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, mensaje: creado });
  });
});

describe('GET /mensajes/:contraparteId', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/mensajes/2');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si el paciente y el médico no están asignados entre sí', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: '5' });

    const res = await request(app)
      .get('/mensajes/2')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve la conversación del paciente con el médico indicado', async () => {
    const mensajes = [mensajeDelPaciente];
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: '2' });
    vi.spyOn(mensajeService, 'obtenerConversacion').mockResolvedValue(mensajes);

    const res = await request(app)
      .get('/mensajes/2')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, mensajes });
    expect(mensajeService.obtenerConversacion).toHaveBeenCalledWith(1, '2');
  });

  it('devuelve la conversación del médico con el paciente indicado', async () => {
    const mensajes = [mensajeDelPaciente];
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(mensajeService, 'obtenerConversacion').mockResolvedValue(mensajes);

    const res = await request(app)
      .get('/mensajes/1')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(mensajeService.obtenerConversacion).toHaveBeenCalledWith('1', 2);
  });
});

describe('PUT /mensajes/:id', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).put('/mensajes/7').send({ contenido: 'Nuevo' });

    expect(res.status).toBe(401);
  });

  it('devuelve 400 si el contenido está vacío', async () => {
    const res = await request(app)
      .put('/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: '   ' });

    expect(res.status).toBe(400);
  });

  it('devuelve 404 si el mensaje no existe', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(null);

    const res = await request(app)
      .put('/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: 'Nuevo' });

    expect(res.status).toBe(404);
  });

  it('devuelve 404 si el usuario no participa de la conversación', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);

    const res = await request(app)
      .put('/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 99)}`)
      .send({ contenido: 'Nuevo' });

    expect(res.status).toBe(404);
  });

  it('devuelve 403 si el mensaje lo envió la contraparte', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);

    const res = await request(app)
      .put('/mensajes/7')
      .set('Authorization', `Bearer ${token('medico', 2)}`)
      .send({ contenido: 'Nuevo' });

    expect(res.status).toBe(403);
  });

  it('devuelve 409 si el mensaje ya fue eliminado', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'editar').mockResolvedValue(null);

    const res = await request(app)
      .put('/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: 'Nuevo' });

    expect(res.status).toBe(409);
  });

  it('edita el mensaje propio y devuelve 200', async () => {
    const editado = { ...mensajeDelPaciente, contenido: 'Hola doctora', editado_en: '2026-08-12T10:00:00.000' };
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'editar').mockResolvedValue(editado);

    const res = await request(app)
      .put('/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`)
      .send({ contenido: '  Hola doctora  ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, mensaje: editado });
    expect(mensajeService.editar).toHaveBeenCalledWith(7, 'Hola doctora');
  });
});

describe('DELETE /mensajes/:id', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).delete('/mensajes/7');

    expect(res.status).toBe(401);
  });

  it('devuelve 403 si el mensaje lo envió la contraparte', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);

    const res = await request(app)
      .delete('/mensajes/7')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(403);
  });

  it('devuelve 409 si el mensaje ya estaba eliminado', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'eliminar').mockResolvedValue(null);

    const res = await request(app)
      .delete('/mensajes/7')
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
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'eliminar').mockResolvedValue(eliminado);

    const res = await request(app)
      .delete('/mensajes/7')
      .set('Authorization', `Bearer ${token('paciente', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, mensaje: eliminado });
    expect(mensajeService.eliminar).toHaveBeenCalledWith(7);
  });
});

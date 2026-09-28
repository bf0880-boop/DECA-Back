import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import mensajeAdminService from '../services/mensajeAdminService.js';
import usuarioService from '../services/usuarioService.js';
import adminService from '../services/adminService.js';
import notificacionService from '../services/notificacionService.js';
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

describe('GET /mensajes-admin/conversaciones', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/mensajes-admin/conversaciones');

    expect(res.status).toBe(401);
  });

  it('lista las conversaciones del admin', async () => {
    const conversaciones = [{ usuario_tipo: 'paciente', usuario_id: 3, nombre: 'Juana', apellido: 'Pérez' }];
    const spy = vi.spyOn(mensajeAdminService, 'listarConversacionesDeAdmin').mockResolvedValue(conversaciones);

    const res = await request(app)
      .get('/mensajes-admin/conversaciones')
      .set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, conversaciones });
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('lista los admins que le escribieron a un médico', async () => {
    const spy = vi.spyOn(mensajeAdminService, 'listarConversacionesDeUsuario').mockResolvedValue([]);

    const res = await request(app)
      .get('/mensajes-admin/conversaciones')
      .set('Authorization', `Bearer ${token('medico', 2)}`);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith('medico', 2);
  });
});

describe('GET /mensajes-admin/:contraparteTipo/:contraparteId', () => {
  it('devuelve 400 si el admin pide una conversación con otro admin', async () => {
    const res = await request(app)
      .get('/mensajes-admin/admin/2')
      .set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(400);
  });

  it('el paciente obtiene su conversación con el admin', async () => {
    const spy = vi.spyOn(mensajeAdminService, 'obtenerConversacion').mockResolvedValue([]);

    const res = await request(app)
      .get('/mensajes-admin/admin/1')
      .set('Authorization', `Bearer ${token('paciente', 3)}`);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith('1', 'paciente', 3);
  });
});

describe('POST /mensajes-admin', () => {
  it('el admin puede iniciar una conversación con un paciente', async () => {
    const mensaje = { id: 10, emisor: 'admin', contenido: 'Hola' };
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 3 });
    vi.spyOn(adminService, 'buscarPorId').mockResolvedValue({ id: 1, nombre: 'Ana', apellido: 'Admin' });
    const crear = vi.spyOn(mensajeAdminService, 'crear').mockResolvedValue(mensaje);
    const notificar = vi.spyOn(notificacionService, 'crear').mockResolvedValue({});

    const res = await request(app)
      .post('/mensajes-admin')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ contraparteTipo: 'paciente', contraparteId: 3, contenido: ' Hola ' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, mensaje });
    expect(crear).toHaveBeenCalledWith({
      adminId: 1,
      usuarioTipo: 'paciente',
      usuarioId: 3,
      emisor: 'admin',
      contenido: 'Hola',
    });
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ usuarioTipo: 'paciente', usuarioId: 3 }));
  });

  it('un paciente no puede iniciar una conversación con el admin', async () => {
    vi.spyOn(adminService, 'buscarPorId').mockResolvedValue({ id: 1 });
    vi.spyOn(mensajeAdminService, 'existeConversacion').mockResolvedValue(false);
    const crear = vi.spyOn(mensajeAdminService, 'crear');

    const res = await request(app)
      .post('/mensajes-admin')
      .set('Authorization', `Bearer ${token('paciente', 3)}`)
      .send({ contraparteTipo: 'admin', contraparteId: 1, contenido: 'Hola' });

    expect(res.status).toBe(403);
    expect(crear).not.toHaveBeenCalled();
  });

  it('un paciente puede responder si el admin ya le escribió', async () => {
    vi.spyOn(adminService, 'buscarPorId').mockResolvedValue({ id: 1 });
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 3, nombre: 'Juana', apellido: 'Pérez' });
    vi.spyOn(mensajeAdminService, 'existeConversacion').mockResolvedValue(true);
    vi.spyOn(mensajeAdminService, 'crear').mockResolvedValue({ id: 11 });
    vi.spyOn(notificacionService, 'crear').mockResolvedValue({});

    const res = await request(app)
      .post('/mensajes-admin')
      .set('Authorization', `Bearer ${token('paciente', 3)}`)
      .send({ contraparteTipo: 'admin', contraparteId: 1, contenido: 'Gracias' });

    expect(res.status).toBe(201);
  });

  it('devuelve 404 si el destinatario no existe', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue(null);

    const res = await request(app)
      .post('/mensajes-admin')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ contraparteTipo: 'paciente', contraparteId: 99, contenido: 'Hola' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /mensajes-admin/:id', () => {
  it('no deja borrar un mensaje ajeno', async () => {
    vi.spyOn(mensajeAdminService, 'buscarPorId').mockResolvedValue({
      id: 10, admin_id: 1, usuario_tipo: 'paciente', usuario_id: 3, emisor: 'admin',
    });

    const res = await request(app)
      .delete('/mensajes-admin/10')
      .set('Authorization', `Bearer ${token('paciente', 3)}`);

    expect(res.status).toBe(403);
  });
});

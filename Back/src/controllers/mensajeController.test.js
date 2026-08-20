import { describe, it, expect, vi, afterEach } from 'vitest';

import mensajeModel from '../models/mensajeModel.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import notificacionModel from '../models/notificacionModel.js';
import mensajeController from './mensajeController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
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

describe('enviar', () => {
  it('devuelve 400 si el rol del usuario no participa de la mensajería', async () => {
    const crearSpy = vi.spyOn(mensajeModel, 'crear');
    const req = { usuario: { id: 1, rol: 'admin' }, body: { contenido: 'Hola', medicoId: 2 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Falta el destinatario del mensaje.' });
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('devuelve 400 si falta el destinatario', async () => {
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Hola' }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 400 si el contenido es solo espacios', async () => {
    const crearSpy = vi.spyOn(mensajeModel, 'crear');
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: '   ', medicoId: 2 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El mensaje no puede estar vacío.' });
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('recorta el contenido, crea el mensaje y notifica al médico', async () => {
    vi.spyOn(mensajeModel, 'crear').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue({ nombre: 'Juana', apellido: 'Pérez' });
    vi.spyOn(notificacionModel, 'crear').mockResolvedValue({});
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: '  Hola doctor  ', medicoId: 2 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(mensajeModel.crear).toHaveBeenCalledWith({
      pacienteId: 1,
      medicoId: 2,
      emisor: 'paciente',
      contenido: 'Hola doctor',
    });
    expect(notificacionModel.crear).toHaveBeenCalledWith({
      usuarioTipo: 'medico',
      usuarioId: 2,
      contenido: 'Juana Pérez te envió un mensaje',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, mensaje: mensajeDelPaciente });
  });

  it('toma el destinatario de los params si no viene en el body', async () => {
    vi.spyOn(mensajeModel, 'crear').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Hola' }, params: { contraparteId: '2' } };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(mensajeModel.crear).toHaveBeenCalledWith(expect.objectContaining({ medicoId: '2' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('no crea la notificación si no se encuentra el nombre del emisor', async () => {
    vi.spyOn(mensajeModel, 'crear').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue(null);
    const crearNotificacion = vi.spyOn(notificacionModel, 'crear');
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Hola', medicoId: 2 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(crearNotificacion).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('busca el nombre en médicos cuando el emisor es un médico', async () => {
    vi.spyOn(mensajeModel, 'crear').mockResolvedValue({ ...mensajeDelPaciente, emisor: 'medico' });
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue({ nombre: 'Carlos', apellido: 'Gómez' });
    vi.spyOn(notificacionModel, 'crear').mockResolvedValue({});
    const req = { usuario: { id: 2, rol: 'medico' }, body: { contenido: 'Hola', pacienteId: 1 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(medicoModel.buscarPorId).toHaveBeenCalledWith(2);
    expect(notificacionModel.crear).toHaveBeenCalledWith({
      usuarioTipo: 'paciente',
      usuarioId: 1,
      contenido: 'Carlos Gómez te envió un mensaje',
    });
  });

  it('devuelve 404 si la base rechaza el destinatario inexistente', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(mensajeModel, 'crear').mockRejectedValue(error);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Hola', medicoId: 999 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El destinatario no existe.' });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(mensajeModel, 'crear').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Hola', medicoId: 2 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('obtenerConversacion', () => {
  it('devuelve 400 si el rol no participa de la mensajería', async () => {
    const req = { usuario: { id: 1, rol: 'admin' }, body: {}, params: { contraparteId: '2' } };
    const res = mockRes();

    await mensajeController.obtenerConversacion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Falta indicar la conversación.' });
  });

  it('devuelve 400 si no se indica la contraparte', async () => {
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: {} };
    const res = mockRes();

    await mensajeController.obtenerConversacion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve los mensajes de la conversación', async () => {
    vi.spyOn(mensajeModel, 'obtenerConversacion').mockResolvedValue([mensajeDelPaciente]);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { contraparteId: '2' } };
    const res = mockRes();

    await mensajeController.obtenerConversacion(req, res);

    expect(mensajeModel.obtenerConversacion).toHaveBeenCalledWith(1, '2');
    expect(res.json).toHaveBeenCalledWith({ ok: true, mensajes: [mensajeDelPaciente] });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(mensajeModel, 'obtenerConversacion').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { contraparteId: '2' } };
    const res = mockRes();

    await mensajeController.obtenerConversacion(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('editar', () => {
  it('devuelve 400 si el contenido está vacío', async () => {
    const buscarSpy = vi.spyOn(mensajeModel, 'buscarPorId');
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: '  ' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(buscarSpy).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el mensaje no existe', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve 404 si el usuario no participa de la conversación', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    const req = { usuario: { id: 99, rol: 'paciente' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El mensaje no existe.' });
  });

  it('devuelve 403 si el mensaje lo envió la contraparte', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    const req = { usuario: { id: 2, rol: 'medico' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: 'Solo podés modificar los mensajes que enviaste.',
    });
  });

  it('devuelve 409 si el mensaje ya fue eliminado', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'editar').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('edita el mensaje propio con el contenido recortado', async () => {
    const editado = { ...mensajeDelPaciente, contenido: 'Hola doctora' };
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'editar').mockResolvedValue(editado);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: '  Hola doctora  ' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(mensajeModel.editar).toHaveBeenCalledWith(7, 'Hola doctora');
    expect(res.json).toHaveBeenCalledWith({ ok: true, mensaje: editado });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('eliminar', () => {
  it('devuelve 404 si el mensaje no existe', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve 403 si el mensaje lo envió la contraparte', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    const req = { usuario: { id: 2, rol: 'medico' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('devuelve 409 si el mensaje ya estaba eliminado', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'eliminar').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El mensaje ya estaba eliminado.' });
  });

  it('elimina el mensaje propio', async () => {
    const eliminado = { ...mensajeDelPaciente, contenido: null, eliminado: true };
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'eliminar').mockResolvedValue(eliminado);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(mensajeModel.eliminar).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ ok: true, mensaje: eliminado });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(mensajeModel, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeModel, 'eliminar').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

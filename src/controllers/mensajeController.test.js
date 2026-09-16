import { describe, it, expect, vi, afterEach } from 'vitest';

import mensajeService from '../services/mensajeService.js';
import usuarioService from '../services/usuarioService.js';
import medicoService from '../services/medicoService.js';
import notificacionService from '../services/notificacionService.js';
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
    const crearSpy = vi.spyOn(mensajeService, 'crear');
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
    const crearSpy = vi.spyOn(mensajeService, 'crear');
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: '   ', medicoId: 2 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El mensaje no puede estar vacío.' });
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('recorta el contenido, crea el mensaje y notifica al médico', async () => {
    vi.spyOn(mensajeService, 'crear').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ nombre: 'Juana', apellido: 'Pérez', medico_id: 2 });
    vi.spyOn(notificacionService, 'crear').mockResolvedValue({});
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: '  Hola doctor  ', medicoId: 2 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

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
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, mensaje: mensajeDelPaciente });
  });

  it('toma el destinatario de los params si no viene en el body', async () => {
    vi.spyOn(mensajeService, 'crear').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ nombre: 'Juana', apellido: 'Pérez', medico_id: '2' });
    vi.spyOn(notificacionService, 'crear').mockResolvedValue({});
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Hola' }, params: { contraparteId: '2' } };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(mensajeService.crear).toHaveBeenCalledWith(expect.objectContaining({ medicoId: '2' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('devuelve 403 si el paciente y el médico no están asignados entre sí', async () => {
    const crearSpy = vi.spyOn(mensajeService, 'crear');
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Hola', medicoId: 2 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('no crea la notificación si no se encuentra el nombre del emisor', async () => {
    vi.spyOn(mensajeService, 'crear').mockResolvedValue({ ...mensajeDelPaciente, emisor: 'medico' });
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue(null);
    const crearNotificacion = vi.spyOn(notificacionService, 'crear');
    const req = { usuario: { id: 2, rol: 'medico' }, body: { contenido: 'Hola', pacienteId: 1 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(crearNotificacion).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('busca el nombre en médicos cuando el emisor es un médico', async () => {
    vi.spyOn(mensajeService, 'crear').mockResolvedValue({ ...mensajeDelPaciente, emisor: 'medico' });
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue({ nombre: 'Carlos', apellido: 'Gómez' });
    vi.spyOn(notificacionService, 'crear').mockResolvedValue({});
    const req = { usuario: { id: 2, rol: 'medico' }, body: { contenido: 'Hola', pacienteId: 1 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(medicoService.buscarPorId).toHaveBeenCalledWith(2);
    expect(notificacionService.crear).toHaveBeenCalledWith({
      usuarioTipo: 'paciente',
      usuarioId: 1,
      contenido: 'Carlos Gómez te envió un mensaje',
    });
  });

  it('devuelve 404 si la base rechaza el destinatario inexistente', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 999 });
    vi.spyOn(mensajeService, 'crear').mockRejectedValue(error);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Hola', medicoId: 999 }, params: {} };
    const res = mockRes();

    await mensajeController.enviar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El destinatario no existe.' });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(mensajeService, 'crear').mockRejectedValue(new Error('fallo de conexión'));
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

  it('devuelve 403 si el paciente y el médico no están asignados entre sí', async () => {
    const obtenerSpy = vi.spyOn(mensajeService, 'obtenerConversacion');
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { contraparteId: '2' } };
    const res = mockRes();

    await mensajeController.obtenerConversacion(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(obtenerSpy).not.toHaveBeenCalled();
  });

  it('devuelve los mensajes de la conversación', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: '2' });
    vi.spyOn(mensajeService, 'obtenerConversacion').mockResolvedValue([mensajeDelPaciente]);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { contraparteId: '2' } };
    const res = mockRes();

    await mensajeController.obtenerConversacion(req, res);

    expect(mensajeService.obtenerConversacion).toHaveBeenCalledWith(1, '2');
    expect(res.json).toHaveBeenCalledWith({ ok: true, mensajes: [mensajeDelPaciente] });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: '2' });
    vi.spyOn(mensajeService, 'obtenerConversacion').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { contraparteId: '2' } };
    const res = mockRes();

    await mensajeController.obtenerConversacion(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('editar', () => {
  it('devuelve 400 si el contenido está vacío', async () => {
    const buscarSpy = vi.spyOn(mensajeService, 'buscarPorId');
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: '  ' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(buscarSpy).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el mensaje no existe', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve 404 si el usuario no participa de la conversación', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    const req = { usuario: { id: 99, rol: 'paciente' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El mensaje no existe.' });
  });

  it('devuelve 403 si el mensaje lo envió la contraparte', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
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
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'editar').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('edita el mensaje propio con el contenido recortado', async () => {
    const editado = { ...mensajeDelPaciente, contenido: 'Hola doctora' };
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'editar').mockResolvedValue(editado);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: '  Hola doctora  ' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(mensajeService.editar).toHaveBeenCalledWith(7, 'Hola doctora');
    expect(res.json).toHaveBeenCalledWith({ ok: true, mensaje: editado });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' }, body: { contenido: 'Nuevo' }, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.editar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('eliminar', () => {
  it('devuelve 404 si el mensaje no existe', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve 403 si el mensaje lo envió la contraparte', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    const req = { usuario: { id: 2, rol: 'medico' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('devuelve 409 si el mensaje ya estaba eliminado', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'eliminar').mockResolvedValue(null);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El mensaje ya estaba eliminado.' });
  });

  it('elimina el mensaje propio', async () => {
    const eliminado = { ...mensajeDelPaciente, contenido: null, eliminado: true };
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'eliminar').mockResolvedValue(eliminado);
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(mensajeService.eliminar).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ ok: true, mensaje: eliminado });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(mensajeService, 'buscarPorId').mockResolvedValue(mensajeDelPaciente);
    vi.spyOn(mensajeService, 'eliminar').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' }, body: {}, params: { id: '7' } };
    const res = mockRes();

    await mensajeController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

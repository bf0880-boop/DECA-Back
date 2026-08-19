import { describe, it, expect, vi, afterEach } from 'vitest';

import notificacionModel from '../models/notificacionModel.js';
import notificacionController from './notificacionController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

const notificacion = {
  id: 3,
  usuario_tipo: 'medico',
  usuario_id: 2,
  contenido: 'Juana Pérez te envió un mensaje',
  leida: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listar', () => {
  it('pide las notificaciones del usuario logueado', async () => {
    vi.spyOn(notificacionModel, 'listarPorUsuario').mockResolvedValue([notificacion]);
    const req = { usuario: { id: 2, rol: 'medico' } };
    const res = mockRes();

    await notificacionController.listar(req, res);

    expect(notificacionModel.listarPorUsuario).toHaveBeenCalledWith('medico', 2);
    expect(res.json).toHaveBeenCalledWith({ ok: true, notificaciones: [notificacion] });
  });

  it('devuelve una lista vacía si el usuario no tiene notificaciones', async () => {
    vi.spyOn(notificacionModel, 'listarPorUsuario').mockResolvedValue([]);
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await notificacionController.listar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, notificaciones: [] });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(notificacionModel, 'listarPorUsuario').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 2, rol: 'medico' } };
    const res = mockRes();

    await notificacionController.listar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('marcarLeida', () => {
  it('marca como leída la notificación del propio usuario', async () => {
    const leida = { ...notificacion, leida: true };
    vi.spyOn(notificacionModel, 'marcarLeida').mockResolvedValue(leida);
    const req = { usuario: { id: 2, rol: 'medico' }, params: { id: '3' } };
    const res = mockRes();

    await notificacionController.marcarLeida(req, res);

    expect(notificacionModel.marcarLeida).toHaveBeenCalledWith('3', 'medico', 2);
    expect(res.json).toHaveBeenCalledWith({ ok: true, notificacion: leida });
  });

  it('devuelve 404 si la notificación no existe o es de otro usuario', async () => {
    vi.spyOn(notificacionModel, 'marcarLeida').mockResolvedValue(null);
    const req = { usuario: { id: 99, rol: 'paciente' }, params: { id: '3' } };
    const res = mockRes();

    await notificacionController.marcarLeida(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'La notificación no existe.' });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(notificacionModel, 'marcarLeida').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 2, rol: 'medico' }, params: { id: '3' } };
    const res = mockRes();

    await notificacionController.marcarLeida(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

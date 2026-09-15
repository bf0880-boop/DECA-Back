import { describe, it, expect, vi, afterEach } from 'vitest';

import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import usuarioController from './usuarioController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('perfil', () => {
  it('devuelve 404 si el paciente no existe', async () => {
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 99 } };
    const res = mockRes();

    await usuarioController.perfil(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve los datos del paciente', async () => {
    const paciente = { id: 1, nombre: 'Juana' };
    vi.spyOn(usuarioModel, 'buscarPorId').mockResolvedValue(paciente);
    const req = { usuario: { id: 1 } };
    const res = mockRes();

    await usuarioController.perfil(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, paciente });
  });
});

describe('listar', () => {
  it('devuelve todos los pacientes para un admin', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana' }, { id: 2, nombre: 'Pedro' }];
    const listarTodosSpy = vi.spyOn(usuarioModel, 'listarTodos').mockResolvedValue(pacientes);
    const req = { usuario: { id: 1, rol: 'admin' } };
    const res = mockRes();

    await usuarioController.listar(req, res);

    expect(listarTodosSpy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true, pacientes });
  });

  it('devuelve solo los pacientes asignados cuando lo pide un médico', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana', medico_id: 2 }];
    const listarPorMedicoSpy = vi.spyOn(usuarioModel, 'listarPorMedico').mockResolvedValue(pacientes);
    const req = { usuario: { id: 2, rol: 'medico' } };
    const res = mockRes();

    await usuarioController.listar(req, res);

    expect(listarPorMedicoSpy).toHaveBeenCalledWith(2);
    expect(res.json).toHaveBeenCalledWith({ ok: true, pacientes });
  });

  it('devuelve 500 si ocurre un error inesperado', async () => {
    vi.spyOn(usuarioModel, 'listarTodos').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'admin' } };
    const res = mockRes();

    await usuarioController.listar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('asignarMedico', () => {
  it('devuelve 400 si el médico indicado no existe', async () => {
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue(null);
    const asignarSpy = vi.spyOn(usuarioModel, 'asignarMedico');
    const req = { params: { id: '1' }, body: { medicoId: 99 } };
    const res = mockRes();

    await usuarioController.asignarMedico(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(asignarSpy).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el paciente no existe', async () => {
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue({ id: 2 });
    vi.spyOn(usuarioModel, 'asignarMedico').mockResolvedValue(null);
    const req = { params: { id: '99' }, body: { medicoId: 2 } };
    const res = mockRes();

    await usuarioController.asignarMedico(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('asigna el médico y devuelve el paciente actualizado', async () => {
    vi.spyOn(medicoModel, 'buscarPorId').mockResolvedValue({ id: 2 });
    const paciente = { id: 1, nombre: 'Juana', medico_id: 2 };
    vi.spyOn(usuarioModel, 'asignarMedico').mockResolvedValue(paciente);
    const req = { params: { id: '1' }, body: { medicoId: 2 } };
    const res = mockRes();

    await usuarioController.asignarMedico(req, res);

    expect(usuarioModel.asignarMedico).toHaveBeenCalledWith('1', 2);
    expect(res.json).toHaveBeenCalledWith({ ok: true, paciente });
  });

  it('permite desasignar sin validar médico cuando medicoId es null', async () => {
    const buscarSpy = vi.spyOn(medicoModel, 'buscarPorId');
    vi.spyOn(usuarioModel, 'asignarMedico').mockResolvedValue({ id: 1, medico_id: null });
    const req = { params: { id: '1' }, body: { medicoId: null } };
    const res = mockRes();

    await usuarioController.asignarMedico(req, res);

    expect(buscarSpy).not.toHaveBeenCalled();
    expect(usuarioModel.asignarMedico).toHaveBeenCalledWith('1', null);
  });
});

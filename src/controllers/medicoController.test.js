import { describe, it, expect, vi, afterEach } from 'vitest';

import medicoService from '../services/medicoService.js';
import usuarioService from '../services/usuarioService.js';
import medicoController from './medicoController.js';

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
  it('devuelve 404 si el médico no existe', async () => {
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 99 } };
    const res = mockRes();

    await medicoController.perfil(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve los datos del médico', async () => {
    const medico = { id: 2, nombre: 'Carlos' };
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue(medico);
    const req = { usuario: { id: 2 } };
    const res = mockRes();

    await medicoController.perfil(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medico });
  });
});

describe('listar', () => {
  it('devuelve sólo los médicos verificados para un médico', async () => {
    const medicos = [{ id: 1, verificado: true }];
    vi.spyOn(medicoService, 'listarVerificados').mockResolvedValue(medicos);
    const req = { usuario: { id: 5, rol: 'medico' } };
    const res = mockRes();

    await medicoController.listar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos });
  });

  it('devuelve sólo los médicos verificados para un admin', async () => {
    const medicos = [{ id: 1, verificado: true }];
    vi.spyOn(medicoService, 'listarVerificados').mockResolvedValue(medicos);
    const req = { usuario: { id: 1, rol: 'admin' } };
    const res = mockRes();

    await medicoController.listar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos });
  });

  it('devuelve solo el médico asignado cuando lo pide un paciente', async () => {
    const medico = { id: 2, nombre: 'Laura' };
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(medicoService, 'buscarPorId').mockResolvedValue(medico);
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await medicoController.listar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos: [medico] });
  });

  it('devuelve un array vacío si el paciente todavía no tiene médico asignado', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: null });
    const buscarMedicoSpy = vi.spyOn(medicoService, 'buscarPorId');
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await medicoController.listar(req, res);

    expect(buscarMedicoSpy).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos: [] });
  });
});

describe('pendientes', () => {
  it('devuelve los médicos sin aprobar', async () => {
    const medicos = [{ id: 2, verificado: false }];
    vi.spyOn(medicoService, 'listarPendientes').mockResolvedValue(medicos);
    const req = {};
    const res = mockRes();

    await medicoController.pendientes(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medicos });
  });
});

describe('aprobar', () => {
  it('devuelve 404 si el médico no existe', async () => {
    vi.spyOn(medicoService, 'aprobar').mockResolvedValue(null);
    const req = { params: { id: '99' } };
    const res = mockRes();

    await medicoController.aprobar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve el médico aprobado', async () => {
    const medico = { id: 2, verificado: true };
    vi.spyOn(medicoService, 'aprobar').mockResolvedValue(medico);
    const req = { params: { id: '2' } };
    const res = mockRes();

    await medicoController.aprobar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, medico });
  });
});

describe('eliminar', () => {
  it('devuelve 404 si el médico no existe', async () => {
    vi.spyOn(medicoService, 'eliminar').mockResolvedValue(false);
    const req = { params: { id: '99' } };
    const res = mockRes();

    await medicoController.eliminar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve ok si lo borró', async () => {
    vi.spyOn(medicoService, 'eliminar').mockResolvedValue(true);
    const req = { params: { id: '2' } };
    const res = mockRes();

    await medicoController.eliminar(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

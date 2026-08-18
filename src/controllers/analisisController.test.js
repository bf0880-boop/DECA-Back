import { describe, it, expect, vi, afterEach } from 'vitest';

const analisisModel = require('../models/analisisModel');
const notificacionModel = require('../models/notificacionModel');
const analisisController = require('./analisisController');

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

const analisis = {
  id: 5,
  paciente_id: 1,
  porcentaje: 42.5,
  fecha_hora_entrega: '2026-08-18T10:00:00.000',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('realizar', () => {
  it('devuelve 400 si falta el paciente o el porcentaje', async () => {
    const crearSpy = vi.spyOn(analisisModel, 'crear');
    const req = { usuario: { id: 2, rol: 'medico' }, body: { pacienteId: 1 } };
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('devuelve 400 si el porcentaje no es un número', async () => {
    const req = { usuario: { id: 2, rol: 'medico' }, body: { pacienteId: 1, porcentaje: 'alto' } };
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: 'El porcentaje debe ser un número entre 0 y 100.',
    });
  });

  it('devuelve 400 si el porcentaje está fuera de rango', async () => {
    const req = { usuario: { id: 2, rol: 'medico' }, body: { pacienteId: 1, porcentaje: 150 } };
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('crea el análisis, notifica al paciente y devuelve 201', async () => {
    vi.spyOn(analisisModel, 'crear').mockResolvedValue(analisis);
    vi.spyOn(notificacionModel, 'crear').mockResolvedValue({});
    const req = { usuario: { id: 2, rol: 'medico' }, body: { pacienteId: 1, porcentaje: 42.5 } };
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(analisisModel.crear).toHaveBeenCalledWith({ pacienteId: 1, porcentaje: 42.5 });
    expect(notificacionModel.crear).toHaveBeenCalledWith({
      usuarioTipo: 'paciente',
      usuarioId: 1,
      contenido: 'Recibiste un nuevo análisis.',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, analisis });
  });

  it('no falla la creación aunque la notificación no se pueda crear', async () => {
    vi.spyOn(analisisModel, 'crear').mockResolvedValue(analisis);
    vi.spyOn(notificacionModel, 'crear').mockRejectedValue(new Error('fallo de conexión'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = { usuario: { id: 2, rol: 'medico' }, body: { pacienteId: 1, porcentaje: 42.5 } };
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, analisis });
  });

  it('devuelve 404 si el paciente no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(analisisModel, 'crear').mockRejectedValue(error);
    const req = { usuario: { id: 2, rol: 'medico' }, body: { pacienteId: 999, porcentaje: 10 } };
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El paciente no existe.' });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(analisisModel, 'crear').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 2, rol: 'medico' }, body: { pacienteId: 1, porcentaje: 10 } };
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('listarPropios', () => {
  it('devuelve los análisis del paciente logueado', async () => {
    vi.spyOn(analisisModel, 'listarPorPaciente').mockResolvedValue([analisis]);
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await analisisController.listarPropios(req, res);

    expect(analisisModel.listarPorPaciente).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ ok: true, analisis: [analisis] });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(analisisModel, 'listarPorPaciente').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await analisisController.listarPropios(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('listarDePaciente', () => {
  it('devuelve los análisis del paciente indicado por el médico', async () => {
    vi.spyOn(analisisModel, 'listarPorPaciente').mockResolvedValue([analisis]);
    const req = { usuario: { id: 2, rol: 'medico' }, params: { pacienteId: '1' } };
    const res = mockRes();

    await analisisController.listarDePaciente(req, res);

    expect(analisisModel.listarPorPaciente).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ ok: true, analisis: [analisis] });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(analisisModel, 'listarPorPaciente').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 2, rol: 'medico' }, params: { pacienteId: '1' } };
    const res = mockRes();

    await analisisController.listarDePaciente(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

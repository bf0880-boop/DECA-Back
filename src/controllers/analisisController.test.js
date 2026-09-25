import { describe, it, expect, vi, afterEach } from 'vitest';

import analisisService from '../services/analisisService.js';
import inferenciaService, { ECGRechazado } from '../services/inferenciaService.js';
import notificacionService from '../services/notificacionService.js';
import usuarioService from '../services/usuarioService.js';
import analisisController from './analisisController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

const analisis = {
  id: 5,
  paciente_id: 1,
  porcentaje: 98.7,
  banda: 'alta',
  score: 0.961234,
  modelo_sha: 'b0e2ecfc838e169c',
  fecha_hora_entrega: '2026-08-18T10:00:00.000',
};

const resultadoInferencia = {
  percentil: 98.7,
  banda: 'alta',
  score: 0.961234,
  interpretacion: { texto: '…', ppv: 0.2953 },
  calidad: { duracion_recibida_s: 10 },
  modelo: { sha256: 'b0e2ecfc838e169c' },
};

function reqConArchivo(body = { pacienteId: 1, frecuencia: '500' }) {
  return {
    usuario: { id: 2, rol: 'medico' },
    body,
    file: { buffer: Buffer.from('I,II,III\n0,0,0\n'), originalname: 'ecg.csv' },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('realizar', () => {
  it('devuelve 400 si falta el paciente o el archivo', async () => {
    const crearSpy = vi.spyOn(analisisService, 'crear');
    const analizarSpy = vi.spyOn(inferenciaService, 'analizar');
    const req = { usuario: { id: 2, rol: 'medico' }, body: { pacienteId: 1 }, file: undefined };
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(analizarSpy).not.toHaveBeenCalled();
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('devuelve 403 si el paciente no está asignado al médico', async () => {
    const crearSpy = vi.spyOn(analisisService, 'crear');
    const analizarSpy = vi.spyOn(inferenciaService, 'analizar');
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });
    const req = reqConArchivo();
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(analizarSpy).not.toHaveBeenCalled();
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('crea el análisis, notifica al paciente y devuelve 201', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(inferenciaService, 'analizar').mockResolvedValue(resultadoInferencia);
    vi.spyOn(analisisService, 'crear').mockResolvedValue(analisis);
    vi.spyOn(notificacionService, 'crear').mockResolvedValue({});
    const req = reqConArchivo();
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(inferenciaService.analizar).toHaveBeenCalledWith({
      buffer: req.file.buffer,
      nombreArchivo: 'ecg.csv',
      frecuencia: '500',
      derivaciones: undefined,
    });
    expect(analisisService.crear).toHaveBeenCalledWith({
      pacienteId: 1,
      porcentaje: 98.7,
      banda: 'alta',
      score: 0.961234,
      modeloSha: 'b0e2ecfc838e169c',
    });
    expect(notificacionService.crear).toHaveBeenCalledWith({
      usuarioTipo: 'paciente',
      usuarioId: 1,
      contenido: 'Recibiste un nuevo análisis.',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      analisis,
      interpretacion: resultadoInferencia.interpretacion,
      calidad: resultadoInferencia.calidad,
    });
  });

  it('no falla la creación aunque la notificación no se pueda crear', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(inferenciaService, 'analizar').mockResolvedValue(resultadoInferencia);
    vi.spyOn(analisisService, 'crear').mockResolvedValue(analisis);
    vi.spyOn(notificacionService, 'crear').mockRejectedValue(new Error('fallo de conexión'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = reqConArchivo();
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, analisis }));
  });

  it('devuelve 422 si el servicio de inferencia rechaza el ECG', async () => {
    const crearSpy = vi.spyOn(analisisService, 'crear');
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(inferenciaService, 'analizar').mockRejectedValue(
      new ECGRechazado(422, { codigo: 'senal_corta', mensaje: 'El ECG tiene menos de 7.0 s…' })
    );
    const req = reqConArchivo();
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: 'El ECG tiene menos de 7.0 s…',
      codigo: 'senal_corta',
    });
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('devuelve 503 si el servicio de inferencia no responde', async () => {
    const crearSpy = vi.spyOn(analisisService, 'crear');
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(inferenciaService, 'analizar').mockRejectedValue(
      new ECGRechazado(503, {
        codigo: 'inferencia_no_disponible',
        mensaje: 'El servicio de análisis no está disponible. Intentá de nuevo en un momento.',
      })
    );
    const req = reqConArchivo();
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, codigo: 'inferencia_no_disponible' })
    );
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el paciente no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 999, medico_id: 2 });
    vi.spyOn(inferenciaService, 'analizar').mockResolvedValue(resultadoInferencia);
    vi.spyOn(analisisService, 'crear').mockRejectedValue(error);
    const req = reqConArchivo({ pacienteId: 999, frecuencia: '500' });
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'El paciente no existe.' });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(inferenciaService, 'analizar').mockResolvedValue(resultadoInferencia);
    vi.spyOn(analisisService, 'crear').mockRejectedValue(new Error('fallo de conexión'));
    const req = reqConArchivo();
    const res = mockRes();

    await analisisController.realizar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fallo de conexión' });
  });
});

describe('listarPropios', () => {
  it('devuelve los análisis del paciente logueado', async () => {
    vi.spyOn(analisisService, 'listarPorPaciente').mockResolvedValue([analisis]);
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await analisisController.listarPropios(req, res);

    expect(analisisService.listarPorPaciente).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ ok: true, analisis: [analisis] });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(analisisService, 'listarPorPaciente').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 1, rol: 'paciente' } };
    const res = mockRes();

    await analisisController.listarPropios(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('listarDePaciente', () => {
  it('devuelve 403 si el paciente no está asignado al médico', async () => {
    const listarSpy = vi.spyOn(analisisService, 'listarPorPaciente');
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 5 });
    const req = { usuario: { id: 2, rol: 'medico' }, params: { pacienteId: '1' } };
    const res = mockRes();

    await analisisController.listarDePaciente(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(listarSpy).not.toHaveBeenCalled();
  });

  it('devuelve los análisis del paciente indicado por el médico', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(analisisService, 'listarPorPaciente').mockResolvedValue([analisis]);
    const req = { usuario: { id: 2, rol: 'medico' }, params: { pacienteId: '1' } };
    const res = mockRes();

    await analisisController.listarDePaciente(req, res);

    expect(analisisService.listarPorPaciente).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ ok: true, analisis: [analisis] });
  });

  it('devuelve 500 ante un error inesperado', async () => {
    vi.spyOn(usuarioService, 'buscarPorId').mockResolvedValue({ id: 1, medico_id: 2 });
    vi.spyOn(analisisService, 'listarPorPaciente').mockRejectedValue(new Error('fallo de conexión'));
    const req = { usuario: { id: 2, rol: 'medico' }, params: { pacienteId: '1' } };
    const res = mockRes();

    await analisisController.listarDePaciente(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

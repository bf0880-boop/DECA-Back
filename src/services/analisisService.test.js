import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import analisisService from './analisisService.js';

const analisis = {
  id: 5,
  paciente_id: 1,
  porcentaje: 98.7,
  banda: 'alta',
  score: 0.961234,
  modelo_sha: 'b0e2ecfc838e169c',
  fecha_hora_entrega: '2026-08-18T10:00:00.000',
};

const nuevo = {
  pacienteId: 1,
  porcentaje: 98.7,
  banda: 'alta',
  score: 0.961234,
  modeloSha: 'b0e2ecfc838e169c',
  archivoNombre: 'ecg.csv',
  archivoPathname: 'analisis/1/ecg-abc123.csv',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crear', () => {
  it('inserta el análisis y devuelve la fila creada', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    const resultado = await analisisService.crear(nuevo);

    expect(resultado).toEqual(analisis);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO analisis');
    expect(params).toEqual([
      1,
      98.7,
      'alta',
      0.961234,
      'b0e2ecfc838e169c',
      'ecg.csv',
      'analisis/1/ecg-abc123.csv',
    ]);
  });

  it('lo crea sin aprobar y sin enviar', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    await analisisService.crear(nuevo);

    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain('aprobado, enviado)');
    expect(sql).toContain('FALSE, FALSE)');
  });

  it('devuelve la fecha convertida al horario argentino', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    await analisisService.crear(nuevo);

    expect(pool.query.mock.calls[0][0]).toContain("AT TIME ZONE 'America/Argentina/Buenos_Aires'");
  });

  it('propaga el error si el paciente no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(pool, 'query').mockRejectedValue(error);

    await expect(analisisService.crear({ ...nuevo, pacienteId: 999 })).rejects.toMatchObject({
      code: '23503',
    });
  });
});

describe('listarPorPaciente', () => {
  it('devuelve los análisis del paciente ordenados de más nuevo a más viejo', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    const resultado = await analisisService.listarPorPaciente(1);

    expect(resultado).toEqual([analisis]);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE paciente_id = $1');
    expect(sql).toContain('ORDER BY fecha_hora_entrega DESC');
    expect(params).toEqual([1]);
  });

  it('con soloEnviados filtra los que el médico todavía no envió', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    await analisisService.listarPorPaciente(1, { soloEnviados: true });

    expect(pool.query.mock.calls[0][0]).toContain('AND enviado');
  });

  it('sin opciones devuelve también los no enviados', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    await analisisService.listarPorPaciente(1);

    expect(pool.query.mock.calls[0][0]).not.toContain('AND enviado');
  });

  it('devuelve una lista vacía si el paciente no tiene análisis', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await analisisService.listarPorPaciente(1);

    expect(resultado).toEqual([]);
  });
});

describe('marcarAprobado', () => {
  it('marca el análisis como aprobado y devuelve la fila', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ ...analisis, aprobado: true }] });

    const resultado = await analisisService.marcarAprobado(5);

    expect(resultado).toEqual({ ...analisis, aprobado: true });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('SET aprobado = TRUE');
    expect(sql).toContain('NOT aprobado');
    expect(params).toEqual([5]);
  });

  it('devuelve null si ya estaba aprobado', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    expect(await analisisService.marcarAprobado(5)).toBeNull();
  });
});

describe('eliminarNoAprobado', () => {
  it('borra solo si no está aprobado y devuelve el archivo para limpiarlo', async () => {
    const fila = { id: 5, paciente_id: 1, archivo_pathname: 'analisis/1/ecg-abc123.csv' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [fila] });

    const resultado = await analisisService.eliminarNoAprobado(5);

    expect(resultado).toEqual(fila);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('DELETE FROM analisis');
    expect(sql).toContain('NOT aprobado');
    expect(sql).toContain('archivo_pathname');
    expect(params).toEqual([5]);
  });

  it('devuelve null si ya estaba aprobado o no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    expect(await analisisService.eliminarNoAprobado(5)).toBeNull();
  });
});

describe('marcarEnviado', () => {
  it('marca el análisis como enviado y devuelve la fila', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ ...analisis, enviado: true }] });

    const resultado = await analisisService.marcarEnviado(5);

    expect(resultado).toEqual({ ...analisis, enviado: true });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('SET enviado = TRUE');
    expect(sql).toContain('AND aprobado');
    expect(sql).toContain('NOT enviado');
    expect(params).toEqual([5]);
  });

  it('devuelve null si ya estaba enviado', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    expect(await analisisService.marcarEnviado(5)).toBeNull();
  });
});

describe('buscarPorId', () => {
  it('devuelve null si el análisis no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    expect(await analisisService.buscarPorId(999)).toBeNull();
  });
});

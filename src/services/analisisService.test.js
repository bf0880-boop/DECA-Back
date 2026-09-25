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
    expect(params).toEqual([1, 98.7, 'alta', 0.961234, 'b0e2ecfc838e169c']);
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

  it('devuelve una lista vacía si el paciente no tiene análisis', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await analisisService.listarPorPaciente(1);

    expect(resultado).toEqual([]);
  });
});

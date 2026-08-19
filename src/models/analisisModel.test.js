import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import analisisModel from './analisisModel.js';

const analisis = {
  id: 5,
  paciente_id: 1,
  porcentaje: 42.5,
  fecha_hora_entrega: '2026-08-18T10:00:00.000',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crear', () => {
  it('inserta el análisis y devuelve la fila creada', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    const resultado = await analisisModel.crear({ pacienteId: 1, porcentaje: 42.5 });

    expect(resultado).toEqual(analisis);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO analisis');
    expect(params).toEqual([1, 42.5]);
  });

  it('devuelve la fecha convertida al horario argentino', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    await analisisModel.crear({ pacienteId: 1, porcentaje: 42.5 });

    expect(pool.query.mock.calls[0][0]).toContain("AT TIME ZONE 'America/Argentina/Buenos_Aires'");
  });

  it('propaga el error si el paciente no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(pool, 'query').mockRejectedValue(error);

    await expect(analisisModel.crear({ pacienteId: 999, porcentaje: 10 })).rejects.toMatchObject({
      code: '23503',
    });
  });
});

describe('listarPorPaciente', () => {
  it('devuelve los análisis del paciente ordenados de más nuevo a más viejo', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [analisis] });

    const resultado = await analisisModel.listarPorPaciente(1);

    expect(resultado).toEqual([analisis]);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE paciente_id = $1');
    expect(sql).toContain('ORDER BY fecha_hora_entrega DESC');
    expect(params).toEqual([1]);
  });

  it('devuelve una lista vacía si el paciente no tiene análisis', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await analisisModel.listarPorPaciente(1);

    expect(resultado).toEqual([]);
  });
});

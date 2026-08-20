import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import medicoModel from './medicoModel.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buscarPorId', () => {
  it('devuelve el médico encontrado sin la contraseña', async () => {
    const medico = { id: 2, nombre: 'Carlos', apellido: 'Gómez', mail: 'carlos@test.com', verificado: true };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [medico] });

    const resultado = await medicoModel.buscarPorId(2);

    expect(resultado).toEqual(medico);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('FROM medicos WHERE id = $1');
    expect(sql).not.toContain('contrasena');
    expect(params).toEqual([2]);
  });

  it('devuelve null si el médico no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await medicoModel.buscarPorId(99);

    expect(resultado).toBeNull();
  });

  it('propaga el error si falla la consulta', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('fallo de conexión'));

    await expect(medicoModel.buscarPorId(2)).rejects.toThrow('fallo de conexión');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import medicoModel from './medicoModel.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crear', () => {
  it('inserta el médico como no verificado y lo devuelve sin la contraseña', async () => {
    const medico = { id: 3, nombre: 'Ana', apellido: 'Ruiz', mail: 'ana@test.com', dni: '30111222', matricula: 'MP-1', verificado: false };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [medico] });

    const resultado = await medicoModel.crear({
      nombre: 'Ana',
      apellido: 'Ruiz',
      mail: 'ana@test.com',
      contrasenaHash: 'hash',
      dni: '30111222',
      matricula: 'MP-1',
    });

    expect(resultado).toEqual(medico);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO medicos');
    expect(sql).toContain('FALSE');
    expect(params).toEqual(['Ana', 'Ruiz', 'ana@test.com', 'hash', '30111222', 'MP-1']);
  });
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

describe('buscarPorMail', () => {
  it('devuelve el médico encontrado', async () => {
    const medico = { id: 2, mail: 'carlos@test.com', contrasena: 'hash-guardado' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [medico] });

    const resultado = await medicoModel.buscarPorMail('carlos@test.com');

    expect(resultado).toEqual(medico);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM medicos WHERE mail = $1', ['carlos@test.com']);
  });

  it('devuelve null si no hay ningún médico con ese mail', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await medicoModel.buscarPorMail('nadie@test.com');

    expect(resultado).toBeNull();
  });
});

describe('listarVerificados', () => {
  it('sólo pide los médicos aprobados', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    await medicoModel.listarVerificados();

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE verificado = TRUE');
  });
});

describe('listarPendientes', () => {
  it('sólo pide los médicos sin aprobar', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    await medicoModel.listarPendientes();

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE verificado = FALSE');
  });
});

describe('aprobar', () => {
  it('marca el médico como verificado y lo devuelve', async () => {
    const medico = { id: 3, nombre: 'Ana', verificado: true };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [medico] });

    const resultado = await medicoModel.aprobar(3);

    expect(resultado).toEqual(medico);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('SET verificado = TRUE');
    expect(params).toEqual([3]);
  });

  it('devuelve null si el médico no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await medicoModel.aprobar(99);

    expect(resultado).toBeNull();
  });
});

describe('eliminar', () => {
  it('devuelve true si borró una fila', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1 });

    const resultado = await medicoModel.eliminar(3);

    expect(resultado).toBe(true);
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM medicos WHERE id = $1', [3]);
  });

  it('devuelve false si no existía', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 0 });

    const resultado = await medicoModel.eliminar(99);

    expect(resultado).toBe(false);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import adminModel from './adminModel.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buscarPorId', () => {
  it('devuelve el admin encontrado sin la contraseña', async () => {
    const admin = { id: 1, nombre: 'Ana', apellido: 'Ríos', mail: 'ana@test.com', verificado: true };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [admin] });

    const resultado = await adminModel.buscarPorId(1);

    expect(resultado).toEqual(admin);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('FROM admins WHERE id = $1');
    expect(sql).not.toContain('contrasena');
    expect(params).toEqual([1]);
  });

  it('devuelve null si el admin no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await adminModel.buscarPorId(99);

    expect(resultado).toBeNull();
  });

  it('propaga el error si falla la consulta', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('fallo de conexión'));

    await expect(adminModel.buscarPorId(1)).rejects.toThrow('fallo de conexión');
  });
});

describe('buscarPorMail', () => {
  it('devuelve el admin encontrado', async () => {
    const admin = { id: 1, mail: 'ana@test.com', contrasena: 'hash-guardado' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [admin] });

    const resultado = await adminModel.buscarPorMail('ana@test.com');

    expect(resultado).toEqual(admin);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM admins WHERE mail = $1', ['ana@test.com']);
  });

  it('devuelve null si no hay ningún admin con ese mail', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await adminModel.buscarPorMail('nadie@test.com');

    expect(resultado).toBeNull();
  });
});

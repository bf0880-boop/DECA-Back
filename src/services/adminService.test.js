import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import adminService from './adminService.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buscarPorId', () => {
  it('devuelve el admin encontrado sin la contraseña', async () => {
    const admin = { id: 1, nombre: 'Ana', apellido: 'Ríos', mail: 'ana@test.com', verificado: true };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [admin] });

    const resultado = await adminService.buscarPorId(1);

    expect(resultado).toEqual(admin);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('FROM admins WHERE id = $1');
    expect(sql).not.toContain('contrasena');
    expect(params).toEqual([1]);
  });

  it('devuelve null si el admin no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await adminService.buscarPorId(99);

    expect(resultado).toBeNull();
  });

  it('propaga el error si falla la consulta', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('fallo de conexión'));

    await expect(adminService.buscarPorId(1)).rejects.toThrow('fallo de conexión');
  });
});

describe('buscarPorMail', () => {
  it('devuelve el admin encontrado', async () => {
    const admin = { id: 1, mail: 'ana@test.com', contrasena: 'hash-guardado' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [admin] });

    const resultado = await adminService.buscarPorMail('ana@test.com');

    expect(resultado).toEqual(admin);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM admins WHERE mail = $1', ['ana@test.com']);
  });

  it('devuelve null si no hay ningún admin con ese mail', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await adminService.buscarPorMail('nadie@test.com');

    expect(resultado).toBeNull();
  });
});

describe('buscarPorOauth', () => {
  it('devuelve el admin vinculado a ese proveedor', async () => {
    const admin = { id: 1, mail: 'ana@test.com', oauth_provider: 'google', oauth_id: 'google-sub-1' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [admin] });

    const resultado = await adminService.buscarPorOauth('google', 'google-sub-1');

    expect(resultado).toEqual(admin);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM admins WHERE oauth_provider = $1 AND oauth_id = $2',
      ['google', 'google-sub-1']
    );
  });
});

describe('vincularOauth', () => {
  it('actualiza la fila con el proveedor y marca el mail como verificado', async () => {
    const admin = { id: 1, mail_verificado: true };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [admin] });

    const resultado = await adminService.vincularOauth(1, 'google', 'google-sub-1');

    expect(resultado).toEqual(admin);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('SET oauth_provider');
    expect(sql).toContain('mail_verificado = TRUE');
    expect(params).toEqual(['google', 'google-sub-1', 1]);
  });
});

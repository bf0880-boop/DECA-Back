import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import usuarioService from './usuarioService.js';

const datos = {
  nombre: 'Juana',
  apellido: 'Pérez',
  mail: 'juana@test.com',
  oauthProvider: 'google',
  oauthId: 'google-sub-1',
  fechaNacimiento: '1990-01-01',
  dni: '12345678',
  obraSocial: 'OSDE',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crearOauth', () => {
  it('inserta el paciente con los datos recibidos y devuelve la fila creada', async () => {
    const paciente = { id: 1, mail: datos.mail };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioService.crearOauth(datos);

    expect(resultado).toEqual(paciente);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO pacientes');
    expect(sql).toContain('mail_verificado');
    expect(params).toEqual([
      datos.nombre,
      datos.apellido,
      datos.mail,
      datos.fechaNacimiento,
      datos.dni,
      datos.obraSocial,
      datos.oauthProvider,
      datos.oauthId,
    ]);
  });

  it('guarda null si no se indica obra social', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ id: 1 }] });

    await usuarioService.crearOauth({ ...datos, obraSocial: undefined });

    expect(pool.query.mock.calls[0][1][5]).toBeNull();
  });

  it('propaga el error si falla la consulta', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('dni duplicado'));

    await expect(usuarioService.crearOauth(datos)).rejects.toThrow('dni duplicado');
  });
});

describe('buscarPorMail', () => {
  it('devuelve el paciente encontrado', async () => {
    const paciente = { id: 1, mail: datos.mail };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioService.buscarPorMail(datos.mail);

    expect(resultado).toEqual(paciente);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM pacientes WHERE mail = $1', [datos.mail]);
  });

  it('devuelve null si no hay ningún paciente con ese mail', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await usuarioService.buscarPorMail('nadie@test.com');

    expect(resultado).toBeNull();
  });
});

describe('buscarPorOauth', () => {
  it('devuelve el paciente vinculado a ese proveedor', async () => {
    const paciente = { id: 1, mail: datos.mail, oauth_provider: 'google', oauth_id: 'google-sub-1' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioService.buscarPorOauth('google', 'google-sub-1');

    expect(resultado).toEqual(paciente);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM pacientes WHERE oauth_provider = $1 AND oauth_id = $2',
      ['google', 'google-sub-1']
    );
  });

  it('devuelve null si no hay ningún paciente vinculado', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await usuarioService.buscarPorOauth('google', 'no-existe');

    expect(resultado).toBeNull();
  });
});

describe('vincularOauth', () => {
  it('actualiza la fila con el proveedor y marca el mail como verificado', async () => {
    const paciente = { id: 1, mail_verificado: true };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioService.vincularOauth(1, 'google', 'google-sub-1');

    expect(resultado).toEqual(paciente);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('SET oauth_provider');
    expect(sql).toContain('mail_verificado = TRUE');
    expect(params).toEqual(['google', 'google-sub-1', 1]);
  });
});

describe('buscarPorId', () => {
  it('devuelve el paciente encontrado sin la contraseña', async () => {
    const paciente = { id: 1, nombre: 'Juana' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioService.buscarPorId(1);

    expect(resultado).toEqual(paciente);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('FROM pacientes WHERE id = $1');
    expect(sql).not.toContain('contrasena');
    expect(params).toEqual([1]);
  });

  it('devuelve null si el paciente no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await usuarioService.buscarPorId(99);

    expect(resultado).toBeNull();
  });
});

describe('listarTodos', () => {
  it('devuelve todos los pacientes sin la contraseña', async () => {
    const pacientes = [{ id: 1, nombre: 'Juana' }, { id: 2, nombre: 'Pedro' }];
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: pacientes });

    const resultado = await usuarioService.listarTodos();

    expect(resultado).toEqual(pacientes);
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('FROM pacientes');
    expect(sql).not.toContain('contrasena');
  });

  it('devuelve un array vacío si no hay pacientes', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await usuarioService.listarTodos();

    expect(resultado).toEqual([]);
  });
});

describe('asignarMedico', () => {
  it('actualiza el medico_id del paciente y devuelve la fila actualizada', async () => {
    const paciente = { id: 1, nombre: 'Juana', medico_id: 2 };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioService.asignarMedico(1, 2);

    expect(resultado).toEqual(paciente);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('UPDATE pacientes SET medico_id');
    expect(params).toEqual([2, 1]);
  });

  it('guarda null cuando se desasigna al médico', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ id: 1, medico_id: null }] });

    await usuarioService.asignarMedico(1, null);

    expect(pool.query.mock.calls[0][1]).toEqual([null, 1]);
  });

  it('devuelve null si el paciente no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await usuarioService.asignarMedico(99, 2);

    expect(resultado).toBeNull();
  });
});

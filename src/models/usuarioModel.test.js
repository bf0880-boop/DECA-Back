import { describe, it, expect, vi, afterEach } from 'vitest';

const pool = require('../config/db');
const usuarioModel = require('./usuarioModel');

const datos = {
  nombre: 'Juana',
  apellido: 'Pérez',
  mail: 'juana@test.com',
  contrasenaHash: 'hash-simulado',
  fechaNacimiento: '1990-01-01',
  dni: '12345678',
  obraSocial: 'OSDE',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crear', () => {
  it('inserta el paciente con los datos recibidos y devuelve la fila creada', async () => {
    const paciente = { id: 1, mail: datos.mail };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioModel.crear(datos);

    expect(resultado).toEqual(paciente);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO pacientes');
    expect(params).toEqual([
      datos.nombre,
      datos.apellido,
      datos.mail,
      datos.contrasenaHash,
      datos.fechaNacimiento,
      datos.dni,
      datos.obraSocial,
    ]);
  });

  it('guarda null si no se indica obra social', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ id: 1 }] });

    await usuarioModel.crear({ ...datos, obraSocial: undefined });

    expect(pool.query.mock.calls[0][1][6]).toBeNull();
  });

  it('no devuelve la contraseña entre las columnas del RETURNING', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ id: 1 }] });

    await usuarioModel.crear(datos);

    const returning = pool.query.mock.calls[0][0].split('RETURNING')[1];
    expect(returning).toBeDefined();
    expect(returning).not.toContain('contrasena');
  });

  it('propaga el error si falla la consulta', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('dni duplicado'));

    await expect(usuarioModel.crear(datos)).rejects.toThrow('dni duplicado');
  });
});

describe('buscarPorMail', () => {
  it('devuelve el paciente encontrado', async () => {
    const paciente = { id: 1, mail: datos.mail, contrasena: 'hash-guardado' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioModel.buscarPorMail(datos.mail);

    expect(resultado).toEqual(paciente);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM pacientes WHERE mail = $1', [datos.mail]);
  });

  it('devuelve null si no hay ningún paciente con ese mail', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await usuarioModel.buscarPorMail('nadie@test.com');

    expect(resultado).toBeNull();
  });
});

describe('buscarPorId', () => {
  it('devuelve el paciente encontrado sin la contraseña', async () => {
    const paciente = { id: 1, nombre: 'Juana' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [paciente] });

    const resultado = await usuarioModel.buscarPorId(1);

    expect(resultado).toEqual(paciente);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('FROM pacientes WHERE id = $1');
    expect(sql).not.toContain('contrasena');
    expect(params).toEqual([1]);
  });

  it('devuelve null si el paciente no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await usuarioModel.buscarPorId(99);

    expect(resultado).toBeNull();
  });
});

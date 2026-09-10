import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import verificacionModel from './verificacionModel.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generarCodigo', () => {
  it('genera un código numérico de 6 dígitos', () => {
    for (let i = 0; i < 50; i += 1) {
      const codigo = verificacionModel.generarCodigo();
      expect(codigo).toMatch(/^\d{6}$/);
    }
  });
});

describe('crearCodigo', () => {
  it('borra los códigos previos del usuario y guarda uno nuevo con vencimiento', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const codigo = await verificacionModel.crearCodigo('paciente', 1, 15);

    expect(codigo).toMatch(/^\d{6}$/);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'DELETE FROM codigos_verificacion WHERE usuario_tipo = $1 AND usuario_id = $2',
      ['paciente', 1]
    );
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('INSERT INTO codigos_verificacion');
    expect(sql).toContain('make_interval(mins => $4)');
    expect(params).toEqual(['paciente', 1, codigo, 15]);
  });
});

describe('consumirCodigo', () => {
  it('devuelve true y borra el código cuando es válido y no venció', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1 });

    const resultado = await verificacionModel.consumirCodigo('paciente', 1, '123456');

    expect(resultado).toBe(true);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('DELETE FROM codigos_verificacion');
    expect(sql).toContain('expira_en > NOW()');
    expect(params).toEqual(['paciente', 1, '123456']);
  });

  it('devuelve false si el código es inválido o venció', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 0 });

    const resultado = await verificacionModel.consumirCodigo('paciente', 1, '000000');

    expect(resultado).toBe(false);
  });
});

describe('marcarMailVerificado', () => {
  it.each([
    ['paciente', 'pacientes'],
    ['medico', 'medicos'],
    ['admin', 'admins'],
  ])('marca el mail_verificado en la tabla correspondiente a %s', async (rol, tabla) => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1 });

    await verificacionModel.marcarMailVerificado(rol, 5);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain(`UPDATE ${tabla}`);
    expect(sql).toContain('SET mail_verificado = TRUE');
    expect(params).toEqual([5]);
  });

  it('rechaza un tipo de usuario desconocido', async () => {
    const spy = vi.spyOn(pool, 'query');

    await expect(verificacionModel.marcarMailVerificado('otro', 5)).rejects.toThrow(
      'Tipo de usuario inválido.'
    );
    expect(spy).not.toHaveBeenCalled();
  });
});

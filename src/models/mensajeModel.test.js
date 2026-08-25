import { describe, it, expect, vi, afterEach } from 'vitest';

import pool from '../config/db.js';
import mensajeModel from './mensajeModel.js';

const mensaje = {
  id: 7,
  paciente_id: 1,
  medico_id: 2,
  emisor: 'paciente',
  contenido: 'Hola doctor',
  eliminado: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crear', () => {
  it('inserta el mensaje y devuelve la fila creada', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [mensaje] });

    const resultado = await mensajeModel.crear({
      pacienteId: 1,
      medicoId: 2,
      emisor: 'paciente',
      contenido: 'Hola doctor',
    });

    expect(resultado).toEqual(mensaje);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO mensajes');
    expect(params).toEqual([1, 2, 'paciente', 'Hola doctor']);
  });

  it('devuelve las fechas convertidas al horario argentino', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [mensaje] });

    await mensajeModel.crear({ pacienteId: 1, medicoId: 2, emisor: 'paciente', contenido: 'Hola' });

    expect(pool.query.mock.calls[0][0]).toContain("AT TIME ZONE 'America/Argentina/Buenos_Aires'");
  });

  it('propaga el error si el destinatario no existe', async () => {
    const error = new Error('violación de llave foránea');
    error.code = '23503';
    vi.spyOn(pool, 'query').mockRejectedValue(error);

    await expect(
      mensajeModel.crear({ pacienteId: 1, medicoId: 999, emisor: 'paciente', contenido: 'Hola' })
    ).rejects.toMatchObject({ code: '23503' });
  });
});

describe('obtenerConversacion', () => {
  it('devuelve los mensajes ordenados por fecha ascendente', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [mensaje] });

    const resultado = await mensajeModel.obtenerConversacion(1, 2);

    expect(resultado).toEqual([mensaje]);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE paciente_id = $1 AND medico_id = $2');
    expect(sql).toContain('ORDER BY fecha_hora_entrega ASC');
    expect(params).toEqual([1, 2]);
  });

  it('devuelve una lista vacía si no hay mensajes', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await mensajeModel.obtenerConversacion(1, 2);

    expect(resultado).toEqual([]);
  });
});

describe('buscarPorId', () => {
  it('devuelve el mensaje encontrado', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [mensaje] });

    const resultado = await mensajeModel.buscarPorId(7);

    expect(resultado).toEqual(mensaje);
    expect(pool.query.mock.calls[0][1]).toEqual([7]);
  });

  it('devuelve null si el mensaje no existe', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await mensajeModel.buscarPorId(99);

    expect(resultado).toBeNull();
  });

  it('oculta el contenido de los mensajes eliminados', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ ...mensaje, contenido: null, eliminado: true }] });

    await mensajeModel.buscarPorId(7);

    expect(pool.query.mock.calls[0][0]).toContain('CASE WHEN eliminado_en IS NULL THEN contenido END AS contenido');
  });
});

describe('editar', () => {
  it('actualiza el contenido y devuelve el mensaje editado', async () => {
    const editado = { ...mensaje, contenido: 'Hola doctora', editado_en: '2026-08-12T10:00:00.000' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [editado] });

    const resultado = await mensajeModel.editar(7, 'Hola doctora');

    expect(resultado).toEqual(editado);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('UPDATE mensajes');
    expect(sql).toContain('editado_en = NOW()');
    expect(params).toEqual([7, 'Hola doctora']);
  });

  it('no edita los mensajes ya eliminados y devuelve null', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await mensajeModel.editar(7, 'Hola doctora');

    expect(resultado).toBeNull();
    expect(pool.query.mock.calls[0][0]).toContain('eliminado_en IS NULL');
  });
});

describe('eliminar', () => {
  it('marca el mensaje como eliminado y devuelve la fila actualizada', async () => {
    const eliminado = { ...mensaje, contenido: null, eliminado: true, eliminado_en: '2026-08-12T10:00:00.000' };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [eliminado] });

    const resultado = await mensajeModel.eliminar(7);

    expect(resultado).toEqual(eliminado);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('eliminado_en = NOW()');
    expect(params).toEqual([7]);
  });

  it('devuelve null si el mensaje ya estaba eliminado', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await mensajeModel.eliminar(7);

    expect(resultado).toBeNull();
    expect(pool.query.mock.calls[0][0]).toContain('eliminado_en IS NULL');
  });
});

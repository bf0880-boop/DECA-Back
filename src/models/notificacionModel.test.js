import { describe, it, expect, vi, afterEach } from 'vitest';

const pool = require('../config/db');
const notificacionModel = require('./notificacionModel');

const notificacion = {
  id: 3,
  usuario_tipo: 'medico',
  usuario_id: 2,
  contenido: 'Juana Pérez te envió un mensaje',
  leida: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crear', () => {
  it('inserta la notificación y devuelve la fila creada', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [notificacion] });

    const resultado = await notificacionModel.crear({
      usuarioTipo: 'medico',
      usuarioId: 2,
      contenido: 'Juana Pérez te envió un mensaje',
    });

    expect(resultado).toEqual(notificacion);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO notificaciones');
    expect(params).toEqual(['medico', 2, 'Juana Pérez te envió un mensaje']);
  });

  it('devuelve la fecha convertida al horario argentino', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [notificacion] });

    await notificacionModel.crear({ usuarioTipo: 'paciente', usuarioId: 1, contenido: 'Hola' });

    expect(pool.query.mock.calls[0][0]).toContain("AT TIME ZONE 'America/Argentina/Buenos_Aires'");
  });

  it('propaga el error si falla la consulta', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('tipo de usuario inválido'));

    await expect(
      notificacionModel.crear({ usuarioTipo: 'otro', usuarioId: 1, contenido: 'Hola' })
    ).rejects.toThrow('tipo de usuario inválido');
  });
});

describe('listarPorUsuario', () => {
  it('devuelve las notificaciones del usuario ordenadas de la más nueva a la más vieja', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [notificacion] });

    const resultado = await notificacionModel.listarPorUsuario('medico', 2);

    expect(resultado).toEqual([notificacion]);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE usuario_tipo = $1 AND usuario_id = $2');
    expect(sql).toContain('ORDER BY fecha_hora_entrega DESC');
    expect(params).toEqual(['medico', 2]);
  });

  it('devuelve una lista vacía si el usuario no tiene notificaciones', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await notificacionModel.listarPorUsuario('paciente', 1);

    expect(resultado).toEqual([]);
  });
});

describe('marcarLeida', () => {
  it('marca la notificación como leída y devuelve la fila actualizada', async () => {
    const leida = { ...notificacion, leida: true };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [leida] });

    const resultado = await notificacionModel.marcarLeida(3, 'medico', 2);

    expect(resultado).toEqual(leida);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('SET leida = TRUE');
    expect(params).toEqual([3, 'medico', 2]);
  });

  it('solo actualiza notificaciones del propio usuario', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

    const resultado = await notificacionModel.marcarLeida(3, 'paciente', 99);

    expect(resultado).toBeNull();
    expect(pool.query.mock.calls[0][0]).toContain('WHERE id = $1 AND usuario_tipo = $2 AND usuario_id = $3');
  });
});

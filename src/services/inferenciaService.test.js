import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import env from '../config/env.js';
import inferenciaService from './inferenciaService.js';

const urlOriginal = env.inferencia.url;

beforeEach(() => {
  env.inferencia.url = undefined;
});

afterEach(() => {
  env.inferencia.url = urlOriginal;
  vi.restoreAllMocks();
});

describe('analizar sin servicio de IA configurado', () => {
  it('devuelve un resultado simulado sin llamar a la red', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.spyOn(Math, 'random').mockReturnValue(0.4237);

    const resultado = await inferenciaService.analizar({ buffer: Buffer.from('x'), nombreArchivo: 'ecg.csv' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({
      percentil: 42.37,
      banda: 'baja',
      score: 0.4237,
      modelo: { sha256: 'simulado' },
    });
  });

  it('asigna la banda según el porcentaje', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95);
    expect((await inferenciaService.analizar({ buffer: Buffer.from('x') })).banda).toBe('alta');

    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    expect((await inferenciaService.analizar({ buffer: Buffer.from('x') })).banda).toBe('media');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import oauthVerifier from './oauthVerifier.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('verifyIdToken', () => {
  it('rechaza proveedores no soportados sin llamar a jwt.verify', async () => {
    const spy = vi.spyOn(jwt, 'verify');

    await expect(oauthVerifier.verifyIdToken('facebook', 'token')).rejects.toThrow(
      'Proveedor OAuth no soportado.'
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('devuelve los datos de identidad a partir de los claims verificados', async () => {
    vi.spyOn(jwt, 'verify').mockImplementation((token, getKey, options, callback) => {
      callback(null, {
        sub: 'google-sub-1',
        email: 'juana@test.com',
        email_verified: true,
        given_name: 'Juana',
        family_name: 'Pérez',
      });
    });

    const resultado = await oauthVerifier.verifyIdToken('google', 'id-token');

    expect(resultado).toEqual({
      sub: 'google-sub-1',
      email: 'juana@test.com',
      emailVerified: true,
      nombre: 'Juana',
      apellido: 'Pérez',
    });
  });

  it('rechaza la promesa si la verificación de firma falla', async () => {
    vi.spyOn(jwt, 'verify').mockImplementation((token, getKey, options, callback) => {
      callback(new Error('firma inválida'));
    });

    await expect(oauthVerifier.verifyIdToken('microsoft', 'id-token')).rejects.toThrow('firma inválida');
  });
});

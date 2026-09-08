import { describe, it, expect, vi, afterEach } from 'vitest';
import { auth } from '../config/auth.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import adminModel from '../models/adminModel.js';
import { verificarToken, permitirRoles } from './authMiddleware.js';

vi.mock('../config/auth.js', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('verificarToken', () => {
  it('rechaza si no hay header de autorización', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Token no provisto.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza si el header no empieza con "Bearer "', async () => {
    const req = { headers: { authorization: 'Token abc123' } };
    const res = mockRes();
    const next = vi.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza un token inválido o expirado', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(null);
    const req = { headers: { authorization: 'Bearer token-invalido' } };
    const res = mockRes();
    const next = vi.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Token inválido o expirado.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza si la sesión es válida pero no hay perfil vinculado', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue({
      user: { id: 'auth-1', email: 'paciente@test.com', role: 'paciente' },
    });
    vi.spyOn(usuarioModel, 'buscarPorAuthUserId').mockResolvedValue(null);
    const req = { headers: { authorization: 'Bearer token-valido' } };
    const res = mockRes();
    const next = vi.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite el paso y setea req.usuario con un token válido', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue({
      user: { id: 'auth-1', email: 'paciente@test.com', role: 'paciente' },
    });
    vi.spyOn(usuarioModel, 'buscarPorAuthUserId').mockResolvedValue({ id: 1 });
    const req = { headers: { authorization: 'Bearer token-valido' } };
    const res = mockRes();
    const next = vi.fn();

    await verificarToken(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.usuario).toEqual({ id: 1, mail: 'paciente@test.com', rol: 'paciente' });
  });

  it('resuelve el perfil de médico cuando el rol de la sesión es médico', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue({
      user: { id: 'auth-2', email: 'medico@test.com', role: 'medico' },
    });
    const buscarSpy = vi.spyOn(medicoModel, 'buscarPorAuthUserId').mockResolvedValue({ id: 2 });
    vi.spyOn(adminModel, 'buscarPorAuthUserId');
    const req = { headers: { authorization: 'Bearer token-valido' } };
    const res = mockRes();
    const next = vi.fn();

    await verificarToken(req, res, next);

    expect(buscarSpy).toHaveBeenCalledWith('auth-2');
    expect(req.usuario).toEqual({ id: 2, mail: 'medico@test.com', rol: 'medico' });
    expect(adminModel.buscarPorAuthUserId).not.toHaveBeenCalled();
  });

  it('rechaza si auth.api.getSession lanza un error', async () => {
    vi.spyOn(auth.api, 'getSession').mockRejectedValue(new Error('sesión corrupta'));
    const req = { headers: { authorization: 'Bearer token-cualquiera' } };
    const res = mockRes();
    const next = vi.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Token inválido o expirado.' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('permitirRoles', () => {
  it('rechaza si no hay usuario en el request', () => {
    const req = {};
    const res = mockRes();
    const next = vi.fn();

    permitirRoles('paciente')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza si el rol del usuario no está permitido', () => {
    const req = { usuario: { rol: 'medico' } };
    const res = mockRes();
    const next = vi.fn();

    permitirRoles('paciente')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'No tenés permiso para acceder a este recurso.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('permite el paso si el rol está entre los permitidos', () => {
    const req = { usuario: { rol: 'medico' } };
    const res = mockRes();
    const next = vi.fn();

    permitirRoles('paciente', 'medico')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

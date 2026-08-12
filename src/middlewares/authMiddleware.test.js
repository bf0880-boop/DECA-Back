import { describe, it, expect, vi } from 'vitest';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { verificarToken, permitirRoles } = require('./authMiddleware');

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('verificarToken', () => {
  it('rechaza si no hay header de autorización', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Token no provisto.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza si el header no empieza con "Bearer "', () => {
    const req = { headers: { authorization: 'Token abc123' } };
    const res = mockRes();
    const next = vi.fn();

    verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza un token inválido o expirado', () => {
    const req = { headers: { authorization: 'Bearer token-invalido' } };
    const res = mockRes();
    const next = vi.fn();

    verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Token inválido o expirado.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('permite el paso y setea req.usuario con un token válido', () => {
    const payload = { id: 1, mail: 'paciente@test.com', rol: 'paciente' };
    const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();

    verificarToken(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.usuario).toMatchObject(payload);
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

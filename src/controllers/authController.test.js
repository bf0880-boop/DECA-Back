import { describe, it, expect, vi, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import oauthVerifier from '../services/oauthVerifier.js';
import usuarioService from '../services/usuarioService.js';
import medicoService from '../services/medicoService.js';
import adminService from '../services/adminService.js';
import authController from './authController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

const identidad = {
  sub: 'google-sub-1',
  email: 'juana@test.com',
  emailVerified: true,
  nombre: 'Juana',
  apellido: 'Pérez',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('iniciar', () => {
  it('devuelve 400 si el proveedor no está soportado', async () => {
    const req = { params: { provider: 'facebook' }, body: { credential: 'x' } };
    const res = mockRes();

    await authController.iniciar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 400 si falta el credential', async () => {
    const req = { params: { provider: 'google' }, body: {} };
    const res = mockRes();

    await authController.iniciar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 401 si el token no se pudo validar', async () => {
    vi.spyOn(oauthVerifier, 'verifyIdToken').mockRejectedValue(new Error('firma inválida'));
    const req = { params: { provider: 'google' }, body: { credential: 'malo' } };
    const res = mockRes();

    await authController.iniciar(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('inicia sesión directo si ya hay una cuenta vinculada a ese proveedor', async () => {
    vi.spyOn(oauthVerifier, 'verifyIdToken').mockResolvedValue(identidad);
    const paciente = { id: 1, mail: identidad.email, oauth_provider: 'google', oauth_id: identidad.sub };
    vi.spyOn(usuarioService, 'buscarPorOauth').mockResolvedValue(paciente);
    const vincularSpy = vi.spyOn(usuarioService, 'vincularOauth');
    const req = { params: { provider: 'google' }, body: { credential: 'ok' } };
    const res = mockRes();

    await authController.iniciar(req, res);

    expect(vincularSpy).not.toHaveBeenCalled();
    const [body] = res.json.mock.calls[0];
    expect(body.ok).toBe(true);
    expect(body.rol).toBe('paciente');
    expect(body.paciente).toEqual(paciente);
    expect(jwt.verify(body.token, env.jwt.secret)).toMatchObject({ id: 1, rol: 'paciente' });
  });

  it('no devuelve el hash de la contraseña al iniciar sesión con OAuth', async () => {
    vi.spyOn(oauthVerifier, 'verifyIdToken').mockResolvedValue(identidad);
    const paciente = { id: 1, mail: identidad.email, oauth_provider: 'google', oauth_id: identidad.sub };
    vi.spyOn(usuarioService, 'buscarPorOauth').mockResolvedValue({ ...paciente, contrasena: '$2a$10$hash' });
    const req = { params: { provider: 'google' }, body: { credential: 'ok' } };
    const res = mockRes();

    await authController.iniciar(req, res);

    expect(res.json.mock.calls[0][0].paciente).toEqual(paciente);
  });

  it('vincula una cuenta vieja con contraseña que coincide por mail', async () => {
    vi.spyOn(oauthVerifier, 'verifyIdToken').mockResolvedValue(identidad);
    vi.spyOn(usuarioService, 'buscarPorOauth').mockResolvedValue(null);
    const cuentaVieja = { id: 1, mail: identidad.email, oauth_id: null };
    vi.spyOn(usuarioService, 'buscarPorMail').mockResolvedValue(cuentaVieja);
    const vinculada = { ...cuentaVieja, oauth_provider: 'google', oauth_id: identidad.sub, mail_verificado: true };
    const vincularSpy = vi.spyOn(usuarioService, 'vincularOauth').mockResolvedValue(vinculada);
    const req = { params: { provider: 'google' }, body: { credential: 'ok' } };
    const res = mockRes();

    await authController.iniciar(req, res);

    expect(vincularSpy).toHaveBeenCalledWith(1, 'google', identidad.sub);
    const [body] = res.json.mock.calls[0];
    expect(body.paciente).toEqual(vinculada);
  });

  it('devuelve 403 si el médico existe pero todavía no fue aprobado', async () => {
    vi.spyOn(oauthVerifier, 'verifyIdToken').mockResolvedValue(identidad);
    vi.spyOn(usuarioService, 'buscarPorOauth').mockResolvedValue(null);
    vi.spyOn(usuarioService, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(medicoService, 'buscarPorOauth').mockResolvedValue(null);
    const medico = { id: 2, mail: identidad.email, oauth_id: identidad.sub, verificado: false };
    vi.spyOn(medicoService, 'buscarPorMail').mockResolvedValue(medico);
    const req = { params: { provider: 'google' }, body: { credential: 'ok' } };
    const res = mockRes();

    await authController.iniciar(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('devuelve isNew y un regToken si no encuentra la cuenta en ninguna tabla', async () => {
    vi.spyOn(oauthVerifier, 'verifyIdToken').mockResolvedValue(identidad);
    vi.spyOn(usuarioService, 'buscarPorOauth').mockResolvedValue(null);
    vi.spyOn(usuarioService, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(medicoService, 'buscarPorOauth').mockResolvedValue(null);
    vi.spyOn(medicoService, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(adminService, 'buscarPorOauth').mockResolvedValue(null);
    vi.spyOn(adminService, 'buscarPorMail').mockResolvedValue(null);
    const req = { params: { provider: 'google' }, body: { credential: 'ok' } };
    const res = mockRes();

    await authController.iniciar(req, res);

    const [body] = res.json.mock.calls[0];
    expect(body.isNew).toBe(true);
    expect(body.perfil).toEqual({ email: identidad.email, nombre: identidad.nombre, apellido: identidad.apellido });
    const ticket = jwt.verify(body.regToken, env.jwt.secret);
    expect(ticket).toMatchObject({ provider: 'google', sub: identidad.sub, email: identidad.email });
  });
});

describe('completarRegistro', () => {
  function regToken(overrides = {}) {
    return jwt.sign(
      {
        provider: 'google',
        sub: 'google-sub-1',
        email: 'juana@test.com',
        nombre: 'Juana',
        apellido: 'Pérez',
        ...overrides,
      },
      env.jwt.secret,
      { expiresIn: '10m' }
    );
  }

  it('devuelve 401 si el regToken es inválido o expiró', async () => {
    const req = { body: { regToken: 'invalido', role: 'paciente', dni: '1', fechaNacimiento: '1990-01-01' } };
    const res = mockRes();

    await authController.completarRegistro(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('devuelve 400 si falta el dni para un paciente', async () => {
    const req = {
      body: { regToken: regToken(), role: 'paciente', fechaNacimiento: '1990-01-01', contrasena: 'secreta123' },
    };
    const res = mockRes();

    await authController.completarRegistro(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 400 si falta la contraseña', async () => {
    const crearSpy = vi.spyOn(usuarioService, 'crearOauth');
    const req = { body: { regToken: regToken(), role: 'paciente', dni: '12345678', fechaNacimiento: '1990-01-01' } };
    const res = mockRes();

    await authController.completarRegistro(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('devuelve 400 si la contraseña tiene menos de 8 caracteres', async () => {
    const crearSpy = vi.spyOn(medicoService, 'crearOauth');
    const req = { body: { regToken: regToken(), role: 'medico', dni: '30111222', contrasena: 'corta' } };
    const res = mockRes();

    await authController.completarRegistro(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: 'La contraseña tiene que tener al menos 8 caracteres.',
    });
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('crea el paciente con la contraseña hasheada y devuelve el token de sesión', async () => {
    const paciente = { id: 5, mail: 'juana@test.com' };
    const crearSpy = vi.spyOn(usuarioService, 'crearOauth').mockResolvedValue(paciente);
    const req = {
      body: {
        regToken: regToken(),
        role: 'paciente',
        dni: '12345678',
        fechaNacimiento: '1990-01-01',
        obraSocial: 'OSDE',
        contrasena: 'secreta123',
      },
    };
    const res = mockRes();

    await authController.completarRegistro(req, res);

    expect(crearSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mail: 'juana@test.com',
        oauthProvider: 'google',
        oauthId: 'google-sub-1',
        dni: '12345678',
      })
    );
    const { contrasena } = crearSpy.mock.calls[0][0];
    expect(contrasena).not.toBe('secreta123');
    expect(await bcrypt.compare('secreta123', contrasena)).toBe(true);
    expect(res.status).toHaveBeenCalledWith(201);
    const [body] = res.json.mock.calls[0];
    expect(body.ok).toBe(true);
    expect(body.paciente).toEqual(paciente);
  });

  it('devuelve 400 si falta el dni para un médico', async () => {
    const req = { body: { regToken: regToken(), role: 'medico', matricula: 'MP-1', contrasena: 'secreta123' } };
    const res = mockRes();

    await authController.completarRegistro(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('crea el médico con la contraseña hasheada como pendiente de aprobación', async () => {
    const medico = { id: 6, mail: 'juana@test.com', verificado: false };
    const crearSpy = vi.spyOn(medicoService, 'crearOauth').mockResolvedValue(medico);
    const req = {
      body: { regToken: regToken(), role: 'medico', dni: '30111222', matricula: 'MP-1', contrasena: 'secreta123' },
    };
    const res = mockRes();

    await authController.completarRegistro(req, res);

    expect(await bcrypt.compare('secreta123', crearSpy.mock.calls[0][0].contrasena)).toBe(true);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, pendingApproval: true, medico });
  });

  it('devuelve 400 si el rol no es válido', async () => {
    const req = { body: { regToken: regToken(), role: 'admin', contrasena: 'secreta123' } };
    const res = mockRes();

    await authController.completarRegistro(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('login', () => {
  const hash = bcrypt.hashSync('secreta123', 4);

  function sinCuentas() {
    vi.spyOn(usuarioService, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(medicoService, 'buscarPorMail').mockResolvedValue(null);
    vi.spyOn(adminService, 'buscarPorMail').mockResolvedValue(null);
  }

  it('devuelve 400 si falta el mail o la contraseña', async () => {
    const req = { body: { mail: 'juana@test.com' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 404 si no hay ninguna cuenta con ese mail', async () => {
    sinCuentas();
    const req = { body: { mail: 'nadie@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve 401 si la cuenta no tiene contraseña', async () => {
    sinCuentas();
    usuarioService.buscarPorMail.mockResolvedValue({ id: 1, mail: 'juana@test.com', contrasena: null });
    const req = { body: { mail: 'juana@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('devuelve 401 si la contraseña no coincide', async () => {
    sinCuentas();
    usuarioService.buscarPorMail.mockResolvedValue({ id: 1, mail: 'juana@test.com', contrasena: hash });
    const req = { body: { mail: 'juana@test.com', contrasena: 'otra-cosa' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Credenciales inválidas.' });
  });

  it('inicia sesión al paciente y no devuelve el hash', async () => {
    sinCuentas();
    usuarioService.buscarPorMail.mockResolvedValue({ id: 1, mail: 'juana@test.com', contrasena: hash });
    const req = { body: { mail: 'juana@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await authController.login(req, res);

    const [body] = res.json.mock.calls[0];
    expect(body.ok).toBe(true);
    expect(body.rol).toBe('paciente');
    expect(body.paciente).toEqual({ id: 1, mail: 'juana@test.com' });
    expect(jwt.verify(body.token, env.jwt.secret)).toMatchObject({ id: 1, rol: 'paciente' });
  });

  it('devuelve 403 si el médico todavía no fue aprobado', async () => {
    sinCuentas();
    medicoService.buscarPorMail.mockResolvedValue({ id: 2, mail: 'ana@test.com', contrasena: hash, verificado: false });
    const req = { body: { mail: 'ana@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('inicia sesión al médico aprobado', async () => {
    sinCuentas();
    medicoService.buscarPorMail.mockResolvedValue({ id: 2, mail: 'ana@test.com', contrasena: hash, verificado: true });
    const req = { body: { mail: 'ana@test.com', contrasena: 'secreta123' } };
    const res = mockRes();

    await authController.login(req, res);

    const [body] = res.json.mock.calls[0];
    expect(body.rol).toBe('medico');
    expect(body.medico).toEqual({ id: 2, mail: 'ana@test.com', verificado: true });
  });
});

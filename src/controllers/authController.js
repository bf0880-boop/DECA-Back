import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import oauthVerifier from '../services/oauthVerifier.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import adminModel from '../models/adminModel.js';

const CUENTAS = [
  { rol: 'paciente', modelo: usuarioModel, clave: 'paciente' },
  { rol: 'medico', modelo: medicoModel, clave: 'medico' },
  { rol: 'admin', modelo: adminModel, clave: 'admin' },
];

function firmarSesion(id, mail, rol) {
  return jwt.sign({ id, mail, rol }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

async function buscarCuentaExistente(provider, identidad) {
  for (const { rol, modelo, clave } of CUENTAS) {
    let cuenta = await modelo.buscarPorOauth(provider, identidad.sub);
    if (!cuenta) cuenta = await modelo.buscarPorMail(identidad.email);
    if (cuenta) return { rol, modelo, clave, cuenta };
  }
  return null;
}

async function iniciar(req, res) {
  try {
    const { provider } = req.params;
    const { credential } = req.body;

    if (provider !== 'google' && provider !== 'microsoft') {
      return res.status(400).json({ ok: false, error: 'Proveedor OAuth no soportado.' });
    }
    if (!credential) {
      return res.status(400).json({ ok: false, error: 'Falta el credential.' });
    }

    const identidad = await oauthVerifier.verifyIdToken(provider, credential);

    const encontrada = await buscarCuentaExistente(provider, identidad);

    if (encontrada) {
      let { rol, clave, modelo, cuenta } = encontrada;

      if (!cuenta.oauth_id) {
        cuenta = await modelo.vincularOauth(cuenta.id, provider, identidad.sub);
      }

      if (rol === 'medico' && !cuenta.verificado) {
        return res.status(403).json({
          ok: false,
          error: 'Tu cuenta todavía no fue aprobada por el administrador.',
        });
      }

      const token = firmarSesion(cuenta.id, cuenta.mail, rol);
      return res.json({ ok: true, token, rol, [clave]: cuenta });
    }

    const regToken = jwt.sign(
      {
        provider,
        sub: identidad.sub,
        email: identidad.email,
        nombre: identidad.nombre,
        apellido: identidad.apellido,
      },
      env.jwt.secret,
      { expiresIn: '10m' }
    );

    res.json({
      ok: true,
      isNew: true,
      regToken,
      perfil: { email: identidad.email, nombre: identidad.nombre, apellido: identidad.apellido },
    });
  } catch (err) {
    res.status(401).json({ ok: false, error: 'No se pudo validar el inicio de sesión.' });
  }
}

async function completarRegistro(req, res) {
  try {
    const { regToken, role, dni, fechaNacimiento, obraSocial, matricula } = req.body;

    let ticket;
    try {
      ticket = jwt.verify(regToken, env.jwt.secret);
    } catch {
      return res.status(401).json({ ok: false, error: 'El registro expiró, volvé a intentar el inicio de sesión.' });
    }
    if (!ticket.sub || !ticket.email) {
      return res.status(400).json({ ok: false, error: 'Ticket de registro inválido.' });
    }

    if (role === 'paciente') {
      if (!dni || !fechaNacimiento) {
        return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios.' });
      }

      const paciente = await usuarioModel.crearOauth({
        nombre: ticket.nombre,
        apellido: ticket.apellido,
        mail: ticket.email,
        oauthProvider: ticket.provider,
        oauthId: ticket.sub,
        fechaNacimiento,
        dni,
        obraSocial,
      });

      const token = firmarSesion(paciente.id, paciente.mail, 'paciente');
      return res.status(201).json({ ok: true, token, rol: 'paciente', paciente });
    }

    if (role === 'medico') {
      if (!dni) {
        return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios.' });
      }

      const medico = await medicoModel.crearOauth({
        nombre: ticket.nombre,
        apellido: ticket.apellido,
        mail: ticket.email,
        oauthProvider: ticket.provider,
        oauthId: ticket.sub,
        dni,
        matricula,
      });

      return res.status(201).json({ ok: true, pendingApproval: true, medico });
    }

    return res.status(400).json({ ok: false, error: 'Rol inválido.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { iniciar, completarRegistro };

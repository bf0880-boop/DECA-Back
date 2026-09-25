import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import oauthVerifier from '../services/oauthVerifier.js';
import usuarioService from '../services/usuarioService.js';
import medicoService from '../services/medicoService.js';
import adminService from '../services/adminService.js';

const CUENTAS = [
  { rol: 'paciente', servicio: usuarioService, clave: 'paciente' },
  { rol: 'medico', servicio: medicoService, clave: 'medico' },
  { rol: 'admin', servicio: adminService, clave: 'admin' },
];

const MIN_CONTRASENA = 8;

function firmarSesion(id, mail, rol) {
  return jwt.sign({ id, mail, rol }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

// Las búsquedas por mail/oauth hacen SELECT *: el hash nunca tiene que llegar al front.
function sinContrasena(cuenta) {
  const { contrasena, ...resto } = cuenta;
  return resto;
}

async function buscarPorMailEnTodas(mail) {
  for (const { rol, servicio, clave } of CUENTAS) {
    const cuenta = await servicio.buscarPorMail(mail);
    if (cuenta) return { rol, clave, cuenta };
  }
  return null;
}

async function buscarCuentaExistente(provider, identidad) {
  for (const { rol, servicio, clave } of CUENTAS) {
    let cuenta = await servicio.buscarPorOauth(provider, identidad.sub);
    if (!cuenta) cuenta = await servicio.buscarPorMail(identidad.email);
    if (cuenta) return { rol, servicio, clave, cuenta };
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
      let { rol, clave, servicio, cuenta } = encontrada;

      if (!cuenta.oauth_id) {
        cuenta = await servicio.vincularOauth(cuenta.id, provider, identidad.sub);
      }

      if (rol === 'medico' && !cuenta.verificado) {
        return res.status(403).json({
          ok: false,
          error: 'Tu cuenta todavía no fue aprobada por el administrador.',
        });
      }

      const token = firmarSesion(cuenta.id, cuenta.mail, rol);
      return res.json({ ok: true, token, rol, [clave]: sinContrasena(cuenta) });
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
    const { regToken, role, dni, fechaNacimiento, obraSocial, matricula, contrasena } = req.body;

    let ticket;
    try {
      ticket = jwt.verify(regToken, env.jwt.secret);
    } catch {
      return res.status(401).json({ ok: false, error: 'El registro expiró, volvé a intentar el inicio de sesión.' });
    }
    if (!ticket.sub || !ticket.email) {
      return res.status(400).json({ ok: false, error: 'Ticket de registro inválido.' });
    }
    if (role !== 'paciente' && role !== 'medico') {
      return res.status(400).json({ ok: false, error: 'Rol inválido.' });
    }
    if (typeof contrasena !== 'string' || contrasena.length < MIN_CONTRASENA) {
      return res.status(400).json({
        ok: false,
        error: `La contraseña tiene que tener al menos ${MIN_CONTRASENA} caracteres.`,
      });
    }

    if (role === 'paciente') {
      if (!dni || !fechaNacimiento) {
        return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios.' });
      }

      const paciente = await usuarioService.crearOauth({
        nombre: ticket.nombre,
        apellido: ticket.apellido,
        mail: ticket.email,
        contrasena: await bcrypt.hash(contrasena, 10),
        oauthProvider: ticket.provider,
        oauthId: ticket.sub,
        fechaNacimiento,
        dni,
        obraSocial,
      });

      const token = firmarSesion(paciente.id, paciente.mail, 'paciente');
      return res.status(201).json({ ok: true, token, rol: 'paciente', paciente });
    }

    if (!dni) {
      return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios.' });
    }

    const medico = await medicoService.crearOauth({
      nombre: ticket.nombre,
      apellido: ticket.apellido,
      mail: ticket.email,
      contrasena: await bcrypt.hash(contrasena, 10),
      oauthProvider: ticket.provider,
      oauthId: ticket.sub,
      dni,
      matricula,
    });

    return res.status(201).json({ ok: true, pendingApproval: true, medico });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function login(req, res) {
  try {
    const { mail, contrasena } = req.body;

    if (!mail || !contrasena) {
      return res.status(400).json({ ok: false, error: 'Mail y contraseña son obligatorios.' });
    }

    const encontrada = await buscarPorMailEnTodas(mail);
    if (!encontrada) {
      return res.status(404).json({ ok: false, error: 'No existe una cuenta con ese mail.' });
    }

    const { rol, clave, cuenta } = encontrada;

    if (!cuenta.contrasena) {
      return res.status(401).json({
        ok: false,
        error: 'Esta cuenta no tiene contraseña. Iniciá sesión con Google o Microsoft.',
      });
    }
    if (!(await bcrypt.compare(contrasena, cuenta.contrasena))) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    if (rol === 'medico' && !cuenta.verificado) {
      return res.status(403).json({
        ok: false,
        error: 'Tu cuenta todavía no fue aprobada por el administrador.',
      });
    }

    const token = firmarSesion(cuenta.id, cuenta.mail, rol);
    res.json({ ok: true, token, rol, [clave]: sinContrasena(cuenta) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { iniciar, completarRegistro, login };

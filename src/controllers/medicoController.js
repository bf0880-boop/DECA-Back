import bcrypt from 'bcryptjs';
import { auth, eliminarUsuarioAuth } from '../config/auth.js';
import medicoModel from '../models/medicoModel.js';
import usuarioModel from '../models/usuarioModel.js';

async function registro(req, res) {
  try {
    const { nombre, apellido, mail, contrasena, dni, matricula } = req.body;

    if (!nombre || !apellido || !mail || !contrasena || !dni) {
      return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios.' });
    }

    const existente = await medicoModel.buscarPorMail(mail);
    if (existente) {
      return res.status(409).json({ ok: false, error: 'Ya existe una cuenta con ese mail.' });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    const { user } = await auth.api.signUpEmail({
      body: { email: mail, password: contrasena, name: `${nombre} ${apellido}`, role: 'medico' },
    });

    let medico;
    try {
      medico = await medicoModel.crear({ nombre, apellido, mail, contrasenaHash, dni, matricula, authUserId: user.id });
    } catch (err) {
      await eliminarUsuarioAuth(user.id);
      throw err;
    }

    res.status(201).json({ ok: true, medico });
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

    const medico = await medicoModel.buscarPorMail(mail);
    if (!medico) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    let sesion;
    try {
      sesion = await auth.api.signInEmail({ body: { email: mail, password: contrasena } });
    } catch (err) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    if (!medico.verificado) {
      return res.status(403).json({
        ok: false,
        error: 'Tu cuenta todavía no fue aprobada por el administrador.',
      });
    }

    res.json({
      ok: true,
      token: sesion.token,
      medico: {
        id: medico.id,
        nombre: medico.nombre,
        apellido: medico.apellido,
        mail: medico.mail,
        verificado: medico.verificado,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function perfil(req, res) {
  try {
    const medico = await medicoModel.buscarPorId(req.usuario.id);
    if (!medico) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }

    res.json({ ok: true, medico });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listar(req, res) {
  try {
    if (req.usuario.rol === 'paciente') {
      const paciente = await usuarioModel.buscarPorId(req.usuario.id);
      const medico = paciente?.medico_id ? await medicoModel.buscarPorId(paciente.medico_id) : null;
      return res.json({ ok: true, medicos: medico ? [medico] : [] });
    }

    const medicos = await medicoModel.listarVerificados();
    res.json({ ok: true, medicos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function pendientes(req, res) {
  try {
    const medicos = await medicoModel.listarPendientes();
    res.json({ ok: true, medicos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function aprobar(req, res) {
  try {
    const medico = await medicoModel.aprobar(req.params.id);
    if (!medico) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }
    res.json({ ok: true, medico });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function eliminar(req, res) {
  try {
    const eliminado = await medicoModel.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { registro, login, perfil, listar, pendientes, aprobar, eliminar };

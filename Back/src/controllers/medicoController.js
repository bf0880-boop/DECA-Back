import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import medicoModel from '../models/medicoModel.js';

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

    const coincide = await bcrypt.compare(contrasena, medico.contrasena);
    if (!coincide) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign({ id: medico.id, mail: medico.mail, rol: 'medico' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    res.json({
      ok: true,
      token,
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
    const medicos = await medicoModel.listarTodos();
    res.json({ ok: true, medicos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { login, perfil, listar };

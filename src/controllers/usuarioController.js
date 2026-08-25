import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import usuarioModel from '../models/usuarioModel.js';

async function registro(req, res) {
  try {
    const { nombre, apellido, mail, contrasena, fechaNacimiento, dni, obraSocial } = req.body;

    if (!nombre || !apellido || !mail || !contrasena || !fechaNacimiento || !dni) {
      return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios.' });
    }

    const existente = await usuarioModel.buscarPorMail(mail);
    if (existente) {
      return res.status(409).json({ ok: false, error: 'Ya existe una cuenta con ese mail.' });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    const paciente = await usuarioModel.crear({
      nombre,
      apellido,
      mail,
      contrasenaHash,
      fechaNacimiento,
      dni,
      obraSocial,
    });

    res.status(201).json({ ok: true, paciente });
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

    const paciente = await usuarioModel.buscarPorMail(mail);
    if (!paciente) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    const coincide = await bcrypt.compare(contrasena, paciente.contrasena);
    if (!coincide) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign({ id: paciente.id, mail: paciente.mail, rol: 'paciente' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    res.json({
      ok: true,
      token,
      paciente: {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        mail: paciente.mail,
        verificado: paciente.verificado,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function perfil(req, res) {
  try {
    const paciente = await usuarioModel.buscarPorId(req.usuario.id);
    if (!paciente) {
      return res.status(404).json({ ok: false, error: 'Paciente no encontrado.' });
    }

    res.json({ ok: true, paciente });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listar(req, res) {
  try {
    const pacientes = await usuarioModel.listarTodos();
    res.json({ ok: true, pacientes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { registro, login, perfil, listar };

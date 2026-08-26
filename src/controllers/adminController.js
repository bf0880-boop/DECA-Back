import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import adminModel from '../models/adminModel.js';

async function login(req, res) {
  try {
    const { mail, contrasena } = req.body;

    if (!mail || !contrasena) {
      return res.status(400).json({ ok: false, error: 'Mail y contraseña son obligatorios.' });
    }

    const admin = await adminModel.buscarPorMail(mail);
    if (!admin) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    const coincide = await bcrypt.compare(contrasena, admin.contrasena);
    if (!coincide) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign({ id: admin.id, mail: admin.mail, rol: 'admin' }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    res.json({
      ok: true,
      token,
      admin: {
        id: admin.id,
        nombre: admin.nombre,
        apellido: admin.apellido,
        mail: admin.mail,
        verificado: admin.verificado,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function perfil(req, res) {
  try {
    const admin = await adminModel.buscarPorId(req.usuario.id);
    if (!admin) {
      return res.status(404).json({ ok: false, error: 'Admin no encontrado.' });
    }

    res.json({ ok: true, admin });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { login, perfil };

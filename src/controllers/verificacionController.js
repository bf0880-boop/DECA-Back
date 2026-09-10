import env from '../config/env.js';
import mailer from '../config/mailer.js';
import verificacionModel from '../models/verificacionModel.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import adminModel from '../models/adminModel.js';

const MODELO_POR_ROL = {
  paciente: usuarioModel,
  medico: medicoModel,
  admin: adminModel,
};

async function enviarCodigo(usuarioTipo, usuario) {
  try {
    const codigo = await verificacionModel.crearCodigo(usuarioTipo, usuario.id, env.verificationCodeTtlMinutes);
    await mailer.enviarCodigoVerificacion({ email: usuario.mail, codigo });
  } catch (err) {
    console.warn(`[verificacion] No se pudo enviar el código a ${usuario.mail}: ${err.message}`);
  }
}

async function enviar(req, res) {
  try {
    const { mail, rol } = req.body;
    const modelo = MODELO_POR_ROL[rol];

    if (!mail || !modelo) {
      return res.status(400).json({ ok: false, error: 'Mail y rol son obligatorios.' });
    }

    const usuario = await modelo.buscarPorMail(mail);
    if (usuario && !usuario.mail_verificado) {
      await enviarCodigo(rol, usuario);
    }

    res.json({ ok: true, mensaje: 'Si el mail está registrado, te enviamos un código de verificación.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function confirmar(req, res) {
  try {
    const { mail, rol, codigo } = req.body;
    const modelo = MODELO_POR_ROL[rol];

    if (!mail || !codigo || !modelo) {
      return res.status(400).json({ ok: false, error: 'Mail, rol y código son obligatorios.' });
    }

    const usuario = await modelo.buscarPorMail(mail);
    if (!usuario) {
      return res.status(400).json({ ok: false, error: 'El código es inválido o venció.' });
    }

    const esValido = await verificacionModel.consumirCodigo(rol, usuario.id, codigo);
    if (!esValido) {
      return res.status(400).json({ ok: false, error: 'El código es inválido o venció.' });
    }

    await verificacionModel.marcarMailVerificado(rol, usuario.id);

    res.json({ ok: true, mensaje: 'Mail verificado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { enviar, confirmar, enviarCodigo };

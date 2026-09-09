import { enviarCodigoDeVerificacion, verificarCodigoDeMail } from '../config/auth.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import adminModel from '../models/adminModel.js';

const modeloPorRol = {
  paciente: usuarioModel,
  medico: medicoModel,
  admin: adminModel,
};

async function enviar(req, res) {
  try {
    const { mail } = req.body;

    if (!mail) {
      return res.status(400).json({ ok: false, error: 'El mail es obligatorio.' });
    }

    await enviarCodigoDeVerificacion(mail);

    // Better Auth responde igual exista o no la cuenta, así nadie puede usar este
    // endpoint para averiguar qué mails están registrados.
    res.json({ ok: true, mensaje: 'Si el mail está registrado, te enviamos un código de verificación.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function confirmar(req, res) {
  try {
    const { mail, codigo } = req.body;

    if (!mail || !codigo) {
      return res.status(400).json({ ok: false, error: 'Mail y código son obligatorios.' });
    }

    let resultado;
    try {
      resultado = await verificarCodigoDeMail(mail, codigo);
    } catch (err) {
      return res.status(400).json({ ok: false, error: 'El código es inválido o venció.' });
    }

    const rol = resultado.user.role;
    const modelo = modeloPorRol[rol];
    const perfil = modelo && (await modelo.buscarPorAuthUserId(resultado.user.id));
    if (!perfil) {
      return res.status(404).json({ ok: false, error: 'No encontramos el perfil asociado a ese mail.' });
    }

    // El médico además necesita la aprobación del admin: el mail ya quedó verificado,
    // pero todavía no le damos sesión.
    if (rol === 'medico' && !perfil.verificado) {
      return res.json({
        ok: true,
        token: null,
        rol,
        requiereAprobacion: true,
        mensaje: 'Verificamos tu mail. Tu cuenta queda pendiente de aprobación por el administrador.',
      });
    }

    res.json({ ok: true, token: resultado.token, rol, usuario: perfil });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { enviar, confirmar };

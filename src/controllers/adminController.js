import { auth, enviarCodigoDeVerificacion, esErrorMailNoVerificado } from '../config/auth.js';
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

    let sesion;
    try {
      sesion = await auth.api.signInEmail({ body: { email: mail, password: contrasena } });
    } catch (err) {
      if (esErrorMailNoVerificado(err)) {
        await enviarCodigoDeVerificacion(mail).catch((error) => {
          console.error('No se pudo reenviar el código de verificación:', error.message);
        });
        return res.status(403).json({
          ok: false,
          requiereVerificacion: true,
          error: 'Tenés que verificar tu mail. Te reenviamos el código.',
        });
      }
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    res.json({
      ok: true,
      token: sesion.token,
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

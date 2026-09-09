import bcrypt from 'bcryptjs';
import {
  auth,
  eliminarUsuarioAuth,
  enviarCodigoDeVerificacion,
  esErrorMailNoVerificado,
} from '../config/auth.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';

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
    const { user } = await auth.api.signUpEmail({
      body: { email: mail, password: contrasena, name: `${nombre} ${apellido}`, role: 'paciente' },
    });

    let paciente;
    try {
      paciente = await usuarioModel.crear({
        nombre,
        apellido,
        mail,
        contrasenaHash,
        fechaNacimiento,
        dni,
        obraSocial,
        authUserId: user.id,
      });
    } catch (err) {
      await eliminarUsuarioAuth(user.id);
      throw err;
    }

    // Un fallo del SMTP no tiene que tirar abajo un registro que ya quedó guardado:
    // el paciente siempre puede pedir otro código en POST /verificacion/enviar.
    let codigoEnviado = true;
    try {
      await enviarCodigoDeVerificacion(mail);
    } catch (err) {
      console.error('No se pudo enviar el código de verificación:', err.message);
      codigoEnviado = false;
    }

    res.status(201).json({
      ok: true,
      paciente,
      requiereVerificacion: true,
      codigoEnviado,
      mensaje: 'Te enviamos un código de verificación al mail para poder entrar.',
    });
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
      paciente: {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        mail: paciente.mail,
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
    const pacientes = req.usuario.rol === 'medico'
      ? await usuarioModel.listarPorMedico(req.usuario.id)
      : await usuarioModel.listarTodos();
    res.json({ ok: true, pacientes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function asignarMedico(req, res) {
  try {
    const { medicoId } = req.body;

    if (medicoId) {
      const medico = await medicoModel.buscarPorId(medicoId);
      if (!medico) {
        return res.status(400).json({ ok: false, error: 'El médico indicado no existe.' });
      }
    }

    const paciente = await usuarioModel.asignarMedico(req.params.id, medicoId || null);
    if (!paciente) {
      return res.status(404).json({ ok: false, error: 'Paciente no encontrado.' });
    }

    res.json({ ok: true, paciente });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { registro, login, perfil, listar, asignarMedico };

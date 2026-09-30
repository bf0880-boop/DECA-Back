import mensajeAdminService from '../services/mensajeAdminService.js';
import usuarioService from '../services/usuarioService.js';
import medicoService from '../services/medicoService.js';
import adminService from '../services/adminService.js';
import notificacionService from '../services/notificacionService.js';

const SERVICIO_POR_ROL = {
  paciente: usuarioService,
  medico: medicoService,
  admin: adminService,
};

async function buscarPersona(rol, id) {
  const servicio = SERVICIO_POR_ROL[rol];
  return servicio ? servicio.buscarPorId(id) : null;
}

/**
 * Traduce "con quién hablo" a los tres datos que identifican la conversación.
 * El admin habla con un paciente o un médico; ellos sólo pueden hablar con un admin.
 */
function resolverConversacion(usuario, contraparteTipo, contraparteId) {
  if (!contraparteTipo || !contraparteId) return null;

  if (usuario.rol === 'admin') {
    if (contraparteTipo !== 'paciente' && contraparteTipo !== 'medico') return null;
    return { adminId: usuario.id, usuarioTipo: contraparteTipo, usuarioId: contraparteId };
  }

  if (contraparteTipo !== 'admin') return null;
  return { adminId: contraparteId, usuarioTipo: usuario.rol, usuarioId: usuario.id };
}

async function notificar(req, conversacion) {
  try {
    const emisor = await buscarPersona(req.usuario.rol, req.usuario.id);
    if (!emisor) return;

    const destinatario = req.usuario.rol === 'admin'
      ? { usuarioTipo: conversacion.usuarioTipo, usuarioId: conversacion.usuarioId }
      : { usuarioTipo: 'admin', usuarioId: conversacion.adminId };

    await notificacionService.crear({
      ...destinatario,
      contenido: `${emisor.nombre} ${emisor.apellido} te envió un mensaje`,
    });
  } catch (err) {
    console.error('No se pudo crear la notificación del mensaje:', err.message);
  }
}

async function conversaciones(req, res) {
  try {
    const { rol, id } = req.usuario;
    const lista = rol === 'admin'
      ? await mensajeAdminService.listarConversacionesDeAdmin(id)
      : await mensajeAdminService.listarConversacionesDeUsuario(rol, id);

    res.json({ ok: true, conversaciones: lista });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function obtenerConversacion(req, res) {
  try {
    const conversacion = resolverConversacion(req.usuario, req.params.contraparteTipo, req.params.contraparteId);
    if (!conversacion) {
      return res.status(400).json({ ok: false, error: 'Falta indicar la conversación.' });
    }

    const mensajes = await mensajeAdminService.obtenerConversacion(
      conversacion.adminId,
      conversacion.usuarioTipo,
      conversacion.usuarioId
    );

    res.json({ ok: true, mensajes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function enviar(req, res) {
  try {
    const { contraparteTipo, contraparteId, contenido } = req.body;
    const conversacion = resolverConversacion(req.usuario, contraparteTipo, contraparteId);

    if (!conversacion) {
      return res.status(400).json({ ok: false, error: 'Falta el destinatario del mensaje.' });
    }

    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ ok: false, error: 'El mensaje no puede estar vacío.' });
    }

    if (!(await buscarPersona(contraparteTipo, contraparteId))) {
      return res.status(404).json({ ok: false, error: 'El destinatario no existe.' });
    }

    if (req.usuario.rol !== 'admin') {
      const existe = await mensajeAdminService.existeConversacion(
        conversacion.adminId,
        conversacion.usuarioTipo,
        conversacion.usuarioId
      );
      if (!existe) {
        return res.status(403).json({ ok: false, error: 'No tenés una conversación con ese administrador.' });
      }
    }

    const mensaje = await mensajeAdminService.crear({
      ...conversacion,
      emisor: req.usuario.rol,
      contenido: contenido.trim(),
    });

    await notificar(req, conversacion);

    res.status(201).json({ ok: true, mensaje });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

function esParticipante(mensaje, usuario) {
  if (usuario.rol === 'admin') return mensaje.admin_id === usuario.id;
  return mensaje.usuario_tipo === usuario.rol && mensaje.usuario_id === usuario.id;
}

async function buscarMensajePropio(req, res) {
  const mensaje = await mensajeAdminService.buscarPorId(req.params.id);

  if (!mensaje || !esParticipante(mensaje, req.usuario)) {
    res.status(404).json({ ok: false, error: 'El mensaje no existe.' });
    return null;
  }

  if (mensaje.emisor !== req.usuario.rol) {
    res.status(403).json({ ok: false, error: 'Solo podés modificar los mensajes que enviaste.' });
    return null;
  }

  return mensaje;
}

async function editar(req, res) {
  try {
    const { contenido } = req.body;

    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ ok: false, error: 'El mensaje no puede estar vacío.' });
    }

    const mensaje = await buscarMensajePropio(req, res);
    if (!mensaje) return;

    const editado = await mensajeAdminService.editar(mensaje.id, contenido.trim());

    if (!editado) {
      return res.status(409).json({ ok: false, error: 'No se puede editar un mensaje eliminado.' });
    }

    res.json({ ok: true, mensaje: editado });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function eliminar(req, res) {
  try {
    const mensaje = await buscarMensajePropio(req, res);
    if (!mensaje) return;

    const eliminado = await mensajeAdminService.eliminar(mensaje.id);

    if (!eliminado) {
      return res.status(409).json({ ok: false, error: 'El mensaje ya estaba eliminado.' });
    }

    res.json({ ok: true, mensaje: eliminado });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { conversaciones, obtenerConversacion, enviar, editar, eliminar };

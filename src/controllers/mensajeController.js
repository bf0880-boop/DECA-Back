const mensajeModel = require('../models/mensajeModel');

function resolverParticipantes(req) {
  const { rol, id } = req.usuario;

  if (rol === 'paciente') {
    return { pacienteId: id, medicoId: req.body.medicoId ?? req.params.contraparteId };
  }

  if (rol === 'medico') {
    return { pacienteId: req.body.pacienteId ?? req.params.contraparteId, medicoId: id };
  }

  return null;
}

async function enviar(req, res) {
  try {
    const { contenido } = req.body;
    const participantes = resolverParticipantes(req);

    if (!participantes || !participantes.pacienteId || !participantes.medicoId) {
      return res.status(400).json({ ok: false, error: 'Falta el destinatario del mensaje.' });
    }

    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ ok: false, error: 'El mensaje no puede estar vacío.' });
    }

    const mensaje = await mensajeModel.crear({
      ...participantes,
      emisor: req.usuario.rol,
      contenido: contenido.trim(),
    });

    res.status(201).json({ ok: true, mensaje });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ ok: false, error: 'El destinatario no existe.' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
}

function esParticipante(mensaje, usuario) {
  if (usuario.rol === 'paciente') return mensaje.paciente_id === usuario.id;
  if (usuario.rol === 'medico') return mensaje.medico_id === usuario.id;
  return false;
}

async function buscarMensajePropio(req, res) {
  const mensaje = await mensajeModel.buscarPorId(req.params.id);

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

    const editado = await mensajeModel.editar(mensaje.id, contenido.trim());

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

    const eliminado = await mensajeModel.eliminar(mensaje.id);

    if (!eliminado) {
      return res.status(409).json({ ok: false, error: 'El mensaje ya estaba eliminado.' });
    }

    res.json({ ok: true, mensaje: eliminado });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function obtenerConversacion(req, res) {
  try {
    const participantes = resolverParticipantes(req);

    if (!participantes || !participantes.pacienteId || !participantes.medicoId) {
      return res.status(400).json({ ok: false, error: 'Falta indicar la conversación.' });
    }

    const mensajes = await mensajeModel.obtenerConversacion(participantes.pacienteId, participantes.medicoId);

    res.json({ ok: true, mensajes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { enviar, obtenerConversacion, editar, eliminar };

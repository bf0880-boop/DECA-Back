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

module.exports = { enviar, obtenerConversacion };

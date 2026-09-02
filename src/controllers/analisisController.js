import analisisModel from '../models/analisisModel.js';
import notificacionModel from '../models/notificacionModel.js';
import usuarioModel from '../models/usuarioModel.js';

async function estaAsignado(pacienteId, medicoId) {
  const paciente = await usuarioModel.buscarPorId(pacienteId);
  return !!paciente && String(paciente.medico_id) === String(medicoId);
}

function porcentajeValido(porcentaje) {
  return typeof porcentaje === 'number' && porcentaje >= 0 && porcentaje <= 100;
}

async function notificarNuevoAnalisis(pacienteId) {
  try {
    await notificacionModel.crear({
      usuarioTipo: 'paciente',
      usuarioId: pacienteId,
      contenido: 'Recibiste un nuevo análisis.',
    });
  } catch (err) {
    console.error('No se pudo crear la notificación del análisis:', err.message);
  }
}

async function realizar(req, res) {
  try {
    const { pacienteId, porcentaje } = req.body;

    if (!pacienteId || porcentaje === undefined || porcentaje === null) {
      return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios.' });
    }

    if (!porcentajeValido(porcentaje)) {
      return res.status(400).json({ ok: false, error: 'El porcentaje debe ser un número entre 0 y 100.' });
    }

    if (!(await estaAsignado(pacienteId, req.usuario.id))) {
      return res.status(403).json({ ok: false, error: 'Ese paciente no está asignado a tu cuenta.' });
    }

    const analisis = await analisisModel.crear({ pacienteId, porcentaje });

    await notificarNuevoAnalisis(pacienteId);

    res.status(201).json({ ok: true, analisis });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ ok: false, error: 'El paciente no existe.' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listarPropios(req, res) {
  try {
    const analisis = await analisisModel.listarPorPaciente(req.usuario.id);
    res.json({ ok: true, analisis });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listarDePaciente(req, res) {
  try {
    if (!(await estaAsignado(req.params.pacienteId, req.usuario.id))) {
      return res.status(403).json({ ok: false, error: 'Ese paciente no está asignado a tu cuenta.' });
    }

    const analisis = await analisisModel.listarPorPaciente(req.params.pacienteId);
    res.json({ ok: true, analisis });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { realizar, listarPropios, listarDePaciente };

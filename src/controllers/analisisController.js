import analisisService from '../services/analisisService.js';
import inferenciaService, { ECGRechazado } from '../services/inferenciaService.js';
import notificacionService from '../services/notificacionService.js';
import usuarioService from '../services/usuarioService.js';

async function estaAsignado(pacienteId, medicoId) {
  const paciente = await usuarioService.buscarPorId(pacienteId);
  return !!paciente && String(paciente.medico_id) === String(medicoId);
}

async function notificarNuevoAnalisis(pacienteId) {
  try {
    await notificacionService.crear({
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
    const { pacienteId, frecuencia, derivaciones } = req.body;

    if (!pacienteId) {
      return res.status(400).json({ ok: false, error: 'Falta el paciente.' });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Falta el archivo del ECG.' });
    }
    if (!(await estaAsignado(pacienteId, req.usuario.id))) {
      return res.status(403).json({ ok: false, error: 'Ese paciente no está asignado a tu cuenta.' });
    }

    const resultado = await inferenciaService.analizar({
      buffer: req.file.buffer,
      nombreArchivo: req.file.originalname,
      frecuencia,
      derivaciones,
    });

    const analisis = await analisisService.crear({
      pacienteId,
      porcentaje: resultado.percentil,
      banda: resultado.banda,
      score: resultado.score,
      modeloSha: resultado.modelo.sha256,
    });

    await notificarNuevoAnalisis(pacienteId);

    // `interpretacion` y `calidad` no se guardan: son para mostrar en el momento.
    // En los GET posteriores sólo vuelve lo que está en la base.
    res.status(201).json({
      ok: true,
      analisis,
      interpretacion: resultado.interpretacion,
      calidad: resultado.calidad,
    });
  } catch (err) {
    if (err instanceof ECGRechazado) {
      return res.status(err.status).json({ ok: false, error: err.message, codigo: err.codigo });
    }
    if (err.code === '23503') {
      return res.status(404).json({ ok: false, error: 'El paciente no existe.' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listarPropios(req, res) {
  try {
    const analisis = await analisisService.listarPorPaciente(req.usuario.id);
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

    const analisis = await analisisService.listarPorPaciente(req.params.pacienteId);
    res.json({ ok: true, analisis });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { realizar, listarPropios, listarDePaciente };

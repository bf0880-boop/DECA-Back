import analisisService from '../services/analisisService.js';
import inferenciaService, { ECGRechazado } from '../services/inferenciaService.js';
import almacenamientoService from '../services/almacenamientoService.js';
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

async function guardarArchivo(file, pacienteId) {
  try {
    return await almacenamientoService.guardarECG({
      buffer: file.buffer,
      nombreArchivo: file.originalname,
      contentType: file.mimetype,
      pacienteId,
    });
  } catch (err) {
    console.error('No se pudo guardar el ECG en Vercel Blob:', err.message);
    return null;
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

    const archivo = await guardarArchivo(req.file, pacienteId);

    const analisis = await analisisService.crear({
      pacienteId,
      porcentaje: resultado.percentil,
      banda: resultado.banda,
      score: resultado.score,
      modeloSha: resultado.modelo.sha256,
      archivoNombre: req.file.originalname,
      archivoPathname: archivo?.pathname ?? null,
    });

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
    const { rol, id } = req.usuario;
    const analisis = rol === 'medico'
      ? await analisisService.listarPorMedico(id)
      : await analisisService.listarPorPaciente(id, { soloEnviados: true });
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

async function enviar(req, res) {
  try {
    const existente = await analisisService.buscarPorId(req.params.id);
    if (!existente) {
      return res.status(404).json({ ok: false, error: 'El análisis no existe.' });
    }
    if (!(await estaAsignado(existente.paciente_id, req.usuario.id))) {
      return res.status(403).json({ ok: false, error: 'Ese paciente no está asignado a tu cuenta.' });
    }

    const analisis = await analisisService.marcarEnviado(req.params.id);
    if (!analisis) {
      return res.status(409).json({ ok: false, error: 'El análisis ya fue enviado al paciente.' });
    }

    await notificarNuevoAnalisis(analisis.paciente_id);
    res.json({ ok: true, analisis });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { realizar, listarPropios, listarDePaciente, enviar };

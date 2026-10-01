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

async function borrarArchivo(pathname) {
  if (!pathname) return;
  try {
    await almacenamientoService.eliminarECG(pathname);
  } catch (err) {
    console.error('No se pudo borrar el ECG de Vercel Blob:', err.message);
  }
}

async function analisisDelMedico(req, res) {
  const analisis = await analisisService.buscarPorId(req.params.id);
  if (!analisis) {
    res.status(404).json({ ok: false, error: 'El análisis no existe.' });
    return null;
  }
  if (!(await estaAsignado(analisis.paciente_id, req.usuario.id))) {
    res.status(403).json({ ok: false, error: 'Ese paciente no está asignado a tu cuenta.' });
    return null;
  }
  return analisis;
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

async function aprobar(req, res) {
  try {
    if (!(await analisisDelMedico(req, res))) return;

    const analisis = await analisisService.marcarAprobado(req.params.id);
    if (!analisis) {
      return res.status(409).json({ ok: false, error: 'El análisis ya fue aprobado.' });
    }

    res.json({ ok: true, analisis });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function rechazar(req, res) {
  try {
    if (!(await analisisDelMedico(req, res))) return;

    const eliminado = await analisisService.eliminarNoAprobado(req.params.id);
    if (!eliminado) {
      return res.status(409).json({ ok: false, error: 'No se puede rechazar un análisis que ya aprobaste.' });
    }

    await borrarArchivo(eliminado.archivo_pathname);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function enviar(req, res) {
  try {
    const existente = await analisisDelMedico(req, res);
    if (!existente) return;
    if (!existente.aprobado) {
      return res.status(409).json({ ok: false, error: 'Primero tenés que aprobar el resultado del análisis.' });
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

export default { realizar, listarPropios, listarDePaciente, aprobar, rechazar, enviar };

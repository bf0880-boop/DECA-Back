import medicoService from '../services/medicoService.js';
import usuarioService from '../services/usuarioService.js';

async function perfil(req, res) {
  try {
    const medico = await medicoService.buscarPorId(req.usuario.id);
    if (!medico) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }

    res.json({ ok: true, medico });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function actualizarPerfil(req, res) {
  try {
    const nombre = req.body.nombre?.trim();
    const apellido = req.body.apellido?.trim();
    const dni = req.body.dni?.trim();
    const matricula = req.body.matricula?.trim();

    if (!nombre || !apellido || !dni) {
      return res.status(400).json({ ok: false, error: 'Nombre, apellido y DNI son obligatorios.' });
    }

    const medico = await medicoService.actualizarPerfil(req.usuario.id, { nombre, apellido, dni, matricula });
    if (!medico) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }

    res.json({ ok: true, medico });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ya existe otra cuenta con ese DNI.' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listar(req, res) {
  try {
    if (req.usuario.rol === 'paciente') {
      const paciente = await usuarioService.buscarPorId(req.usuario.id);
      const medico = paciente?.medico_id ? await medicoService.buscarPorId(paciente.medico_id) : null;
      return res.json({ ok: true, medicos: medico ? [medico] : [] });
    }

    const medicos = await medicoService.listarVerificados();
    res.json({ ok: true, medicos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function pendientes(req, res) {
  try {
    const medicos = await medicoService.listarPendientes();
    res.json({ ok: true, medicos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function aprobar(req, res) {
  try {
    const medico = await medicoService.aprobar(req.params.id);
    if (!medico) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }
    res.json({ ok: true, medico });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function eliminar(req, res) {
  try {
    const eliminado = await medicoService.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { perfil, actualizarPerfil, listar, pendientes, aprobar, eliminar };

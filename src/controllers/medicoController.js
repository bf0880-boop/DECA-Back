import medicoModel from '../models/medicoModel.js';
import usuarioModel from '../models/usuarioModel.js';

async function perfil(req, res) {
  try {
    const medico = await medicoModel.buscarPorId(req.usuario.id);
    if (!medico) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }

    res.json({ ok: true, medico });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listar(req, res) {
  try {
    if (req.usuario.rol === 'paciente') {
      const paciente = await usuarioModel.buscarPorId(req.usuario.id);
      const medico = paciente?.medico_id ? await medicoModel.buscarPorId(paciente.medico_id) : null;
      return res.json({ ok: true, medicos: medico ? [medico] : [] });
    }

    const medicos = await medicoModel.listarVerificados();
    res.json({ ok: true, medicos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function pendientes(req, res) {
  try {
    const medicos = await medicoModel.listarPendientes();
    res.json({ ok: true, medicos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function aprobar(req, res) {
  try {
    const medico = await medicoModel.aprobar(req.params.id);
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
    const eliminado = await medicoModel.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ ok: false, error: 'Médico no encontrado.' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { perfil, listar, pendientes, aprobar, eliminar };

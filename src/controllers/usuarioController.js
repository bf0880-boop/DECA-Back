import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';

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

export default { perfil, listar, asignarMedico };

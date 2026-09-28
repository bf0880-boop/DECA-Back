import usuarioService from '../services/usuarioService.js';
import medicoService from '../services/medicoService.js';

async function perfil(req, res) {
  try {
    const paciente = await usuarioService.buscarPorId(req.usuario.id);
    if (!paciente) {
      return res.status(404).json({ ok: false, error: 'Paciente no encontrado.' });
    }

    res.json({ ok: true, paciente });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function actualizarPerfil(req, res) {
  try {
    const nombre = req.body.nombre?.trim();
    const apellido = req.body.apellido?.trim();
    const dni = req.body.dni?.trim();
    const { fechaNacimiento } = req.body;
    const obraSocial = req.body.obraSocial?.trim();

    if (!nombre || !apellido || !dni || !fechaNacimiento) {
      return res.status(400).json({ ok: false, error: 'Nombre, apellido, DNI y fecha de nacimiento son obligatorios.' });
    }

    const paciente = await usuarioService.actualizarPerfil(req.usuario.id, {
      nombre,
      apellido,
      fechaNacimiento,
      dni,
      obraSocial,
    });
    if (!paciente) {
      return res.status(404).json({ ok: false, error: 'Paciente no encontrado.' });
    }

    res.json({ ok: true, paciente });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ya existe otra cuenta con ese DNI.' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listar(req, res) {
  try {
    const pacientes = req.usuario.rol === 'medico'
      ? await usuarioService.listarPorMedico(req.usuario.id)
      : await usuarioService.listarTodos();
    res.json({ ok: true, pacientes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function asignarMedico(req, res) {
  try {
    const { medicoId } = req.body;

    if (medicoId) {
      const medico = await medicoService.buscarPorId(medicoId);
      if (!medico) {
        return res.status(400).json({ ok: false, error: 'El médico indicado no existe.' });
      }
    }

    const paciente = await usuarioService.asignarMedico(req.params.id, medicoId || null);
    if (!paciente) {
      return res.status(404).json({ ok: false, error: 'Paciente no encontrado.' });
    }

    res.json({ ok: true, paciente });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { perfil, actualizarPerfil, listar, asignarMedico };

import notificacionModel from '../models/notificacionModel.js';

async function listar(req, res) {
  try {
    const notificaciones = await notificacionModel.listarPorUsuario(req.usuario.rol, req.usuario.id);

    res.json({ ok: true, notificaciones });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function marcarLeida(req, res) {
  try {
    const notificacion = await notificacionModel.marcarLeida(req.params.id, req.usuario.rol, req.usuario.id);

    if (!notificacion) {
      return res.status(404).json({ ok: false, error: 'La notificación no existe.' });
    }

    res.json({ ok: true, notificacion });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { listar, marcarLeida };

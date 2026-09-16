import adminService from '../services/adminService.js';

async function perfil(req, res) {
  try {
    const admin = await adminService.buscarPorId(req.usuario.id);
    if (!admin) {
      return res.status(404).json({ ok: false, error: 'Admin no encontrado.' });
    }

    res.json({ ok: true, admin });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { perfil };

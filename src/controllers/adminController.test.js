import { describe, it, expect, vi, afterEach } from 'vitest';

import adminService from '../services/adminService.js';
import adminController from './adminController.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('perfil', () => {
  it('devuelve 404 si el admin no existe', async () => {
    vi.spyOn(adminService, 'buscarPorId').mockResolvedValue(null);
    const req = { usuario: { id: 99 } };
    const res = mockRes();

    await adminController.perfil(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve los datos del admin', async () => {
    const admin = { id: 1, nombre: 'Ana' };
    vi.spyOn(adminService, 'buscarPorId').mockResolvedValue(admin);
    const req = { usuario: { id: 1 } };
    const res = mockRes();

    await adminController.perfil(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true, admin });
  });
});

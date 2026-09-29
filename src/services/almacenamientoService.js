import { put } from '@vercel/blob';
import env from '../config/env.js';

class AlmacenamientoError extends Error {}

async function guardarECG({ buffer, nombreArchivo, contentType, pacienteId }) {
  if (!env.blob.token) {
    throw new AlmacenamientoError('Falta configurar BLOB_READ_WRITE_TOKEN para guardar el archivo.');
  }

  const nombre = (nombreArchivo || 'ecg').replace(/[^\w.-]+/g, '_');

  try {
    const blob = await put(`analisis/${pacienteId}/${nombre}`, buffer, {
      access: env.blob.access,
      addRandomSuffix: true,
      contentType,
    });
    return { pathname: blob.pathname, url: blob.url };
  } catch (err) {
    throw new AlmacenamientoError(`No se pudo guardar el archivo: ${err.message}`);
  }
}

export { AlmacenamientoError };
export default { guardarECG };

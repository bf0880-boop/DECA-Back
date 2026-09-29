import env from '../config/env.js';

const TIMEOUT_MS = 30_000;

class ECGRechazado extends Error {
  constructor(status, error) {
    super(error?.mensaje || 'El ECG no se pudo analizar.');
    this.status = status;
    this.codigo = error?.codigo || 'desconocido';
    this.detalle = error?.detalle;
  }
}

function bandaDe(percentil) {
  if (percentil >= 90) return 'alta';
  if (percentil >= 50) return 'media';
  return 'baja';
}

function simular() {
  const percentil = Math.round(Math.random() * 10000) / 100;
  return {
    percentil,
    banda: bandaDe(percentil),
    score: Math.round((percentil / 100) * 1e6) / 1e6,
    interpretacion: { texto: 'Resultado simulado: todavía no hay un modelo de IA conectado.' },
    calidad: null,
    modelo: { sha256: 'simulado' },
  };
}

async function analizar({ buffer, nombreArchivo, frecuencia, derivaciones }) {
  if (!env.inferencia.url) return simular();

  const form = new FormData();
  form.append('archivo', new Blob([buffer]), nombreArchivo || 'ecg');
  if (frecuencia) form.append('frecuencia', String(frecuencia));
  if (derivaciones) form.append('derivaciones', derivaciones);

  let respuesta;
  try {
    respuesta = await fetch(`${env.inferencia.url}/analizar`, {
      method: 'POST',
      headers: { 'X-DECA-Token': env.inferencia.token },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new ECGRechazado(503, {
      codigo: 'inferencia_no_disponible',
      mensaje: 'El servicio de análisis no está disponible. Intentá de nuevo en un momento.',
      detalle: err.message,
    });
  }

  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !cuerpo?.ok) {
    throw new ECGRechazado(respuesta.status, cuerpo?.error);
  }
  return cuerpo.analisis;
}

export { ECGRechazado };
export default { analizar, ECGRechazado };

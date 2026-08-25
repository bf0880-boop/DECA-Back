import express from 'express';
import cors from 'cors';
import pool from './config/db.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import medicoRoutes from './routes/medicoRoutes.js';
import mensajeRoutes from './routes/mensajeRoutes.js';
import notificacionRoutes from './routes/notificacionRoutes.js';
import analisisRoutes from './routes/analisisRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/medicos', medicoRoutes);
app.use('/api/mensajes', mensajeRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/analisis', analisisRoutes);

app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default app;

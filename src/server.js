import express from 'express';
import cors from 'cors';
import pool from './config/db.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import medicoRoutes from './routes/medicoRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import mensajeRoutes from './routes/mensajeRoutes.js';
import notificacionRoutes from './routes/notificacionRoutes.js';
import analisisRoutes from './routes/analisisRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('usuarios', usuarioRoutes);
app.use('/medicos', medicoRoutes);
app.use('/admins', adminRoutes);
app.use('/mensajes', mensajeRoutes);
app.use('/notificaciones', notificacionRoutes);
app.use('/analisis', analisisRoutes);

app.get('/', async (req, res) => {
  res.status(200).send("DECA API")
 });

app.get('/health', async (req, res) => {
 res.status(200).send("OK")
});

export default app;

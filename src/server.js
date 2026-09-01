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

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/medicos', medicoRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/mensajes', mensajeRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/analisis', analisisRoutes);

app.get('/health', async (req, res) => {
 res.status(200).send("OK")
});

export default app;

const express = require('express');
const cors = require('cors');
const env = require('./src/config/env');
const pool = require('./src/config/db');
const usuarioRoutes = require('./src/routes/usuarioRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/usuarios', usuarioRoutes);

app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(env.port, () => {
  console.log(`Servidor corriendo en el puerto ${env.port}`);
  console.log(`http://localhost:${env.port}`);
});

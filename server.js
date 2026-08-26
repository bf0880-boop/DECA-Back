import env from './src/config/env.js';
import app from './src/server.js';

app.listen(env.port, () => {
  console.log(`Servidor corriendo en el puerto ${env.port}`);
  console.log(`http://localhost:${env.port}`);
});

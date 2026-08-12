const env = require('./src/config/env');
const app = require('./src/app');

app.listen(env.port, () => {
  console.log(`Servidor corriendo en el puerto ${env.port}`);
  console.log(`http://localhost:${env.port}`);
});

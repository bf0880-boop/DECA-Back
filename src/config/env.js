import dotenv from 'dotenv';

dotenv.config();

export default {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
    microsoftTenant: process.env.MICROSOFT_TENANT || 'common',
  },
  inferencia: {
    url: process.env.DECA_INFERENCIA_URL,
    token: process.env.DECA_API_TOKEN,
  },
};

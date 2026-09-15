import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import env from '../config/env.js';

const PROVIDERS = {
  google: {
    issuer: 'https://accounts.google.com',
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    audience: env.oauth.googleClientId,
  },
  microsoft: {
    issuer: `https://login.microsoftonline.com/${env.oauth.microsoftTenant}/v2.0`,
    jwksUri: `https://login.microsoftonline.com/${env.oauth.microsoftTenant}/discovery/v2.0/keys`,
    audience: env.oauth.microsoftClientId,
  },
};

const clients = {};

function getSigningKey(provider, header, callback) {
  clients[provider] ??= jwksClient({ jwksUri: PROVIDERS[provider].jwksUri });
  clients[provider].getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function verifyIdToken(provider, idToken) {
  const config = PROVIDERS[provider];
  if (!config) return Promise.reject(new Error('Proveedor OAuth no soportado.'));

  return new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      (header, callback) => getSigningKey(provider, header, callback),
      { algorithms: ['RS256'], audience: config.audience, issuer: config.issuer },
      (err, payload) => {
        if (err) return reject(err);
        resolve({
          sub: payload.sub,
          email: payload.email,
          emailVerified: payload.email_verified ?? true,
          nombre: payload.given_name || payload.name || '',
          apellido: payload.family_name || '',
        });
      }
    );
  });
}

export default { verifyIdToken };

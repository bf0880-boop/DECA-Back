const pool = require('../config/db');

async function create(userId, code, expiresAt) {
  const { rows } = await pool.query(
    'INSERT INTO verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3) RETURNING *',
    [userId, code, expiresAt]
  );
  return rows[0];
}

async function findValid(userId, code) {
  const { rows } = await pool.query(
    `SELECT * FROM verification_codes
     WHERE user_id = $1 AND code = $2 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, code]
  );
  return rows[0] || null;
}

async function deleteForUser(userId) {
  await pool.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
}

module.exports = { create, findValid, deleteForUser };

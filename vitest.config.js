const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    env: {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
      PGHOST: 'localhost',
      PGDATABASE: 'test',
      PGUSER: 'test',
      PGPASSWORD: 'test',
    },
  },
});

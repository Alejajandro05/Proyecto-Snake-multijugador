const os = require('os');

/**
 * Colyseus Cloud Deployment Configuration.
 * See documentation: https://docs.colyseus.io/deployment/cloud
 */

module.exports = {
  apps : [{
    name: "colyseus-app",
    script: 'build/backend/src/index.js',
    cwd: __dirname,
    time: true,
    watch: false,
    instances: os.cpus().length,
    exec_mode: 'fork',
    wait_ready: true,
    env: {
      NODE_ENV: 'production',
    },
  }],
};


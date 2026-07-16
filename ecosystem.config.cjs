module.exports = {
  apps: [
    {
      name: 'nova-crm-api',
      cwd: '/var/www/novacrm/backend',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};

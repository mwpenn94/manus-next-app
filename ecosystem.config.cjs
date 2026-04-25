module.exports = {
  apps: [
    {
      name: "manus-next-app",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/manus/error.log",
      out_file: "/var/log/manus/out.log",
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 8000,
      // Auto-restart
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};

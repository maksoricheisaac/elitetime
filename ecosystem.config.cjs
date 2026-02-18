module.exports = {
  apps: [
    {
      name: "elitetime",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "C:/Apps/elitetime",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
	NEXT_PUBLIC_SOCKET_URL: "http://10.0.100.58",
        NEXT_ALLOWED_ORIGINS: "10.0.100.58,10.0.100.58:3000"
      },
      error_file: "C:/Apps/elitetime/logs/elitetime-error.log",
      out_file: "C:/Apps/elitetime/logs/elitetime-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
}
/**
 * PM2 process definition for RKL ProjectHub.
 *
 * Copy to /srv/rkl/app/ on the server. PM2 keeps the Node process alive,
 * restarts it after a crash, and (with `pm2 startup`) after a reboot.
 *
 * One instance, not cluster mode: the app is a single small Node process on a
 * 2 vCPU box, and clustering would multiply memory use for no gain at this size.
 */
module.exports = {
  apps: [
    {
      name: "rkl",
      cwd: "/srv/rkl/app/frontend",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production", PORT: 3000 },

      // Restart if memory runs away. On a 4 GB box this is a safety net, not a
      // normal occurrence - if it trips regularly, something is leaking.
      max_memory_restart: "700M",

      autorestart: true,
      // Stop restart-looping on a config error rather than hammering the CPU.
      max_restarts: 10,
      min_uptime: "20s",

      error_file: "/srv/rkl/logs/error.log",
      out_file: "/srv/rkl/logs/out.log",
      time: true,
    },
  ],
}

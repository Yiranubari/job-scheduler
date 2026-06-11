module.exports = {
  apps: [
    {
      name: "api",
      script: "./node_modules/.bin/tsx",
      args: "src/server.ts",
      interpreter: "none",
      cwd: "/home/ubuntu/job-scheduler",
      kill_timeout: 12000,
      env: { NODE_ENV: "production" },
    },
    {
      name: "scheduler",
      script: "./node_modules/.bin/tsx",
      args: "src/scheduler.entry.ts",
      interpreter: "none",
      cwd: "/home/ubuntu/job-scheduler",
      kill_timeout: 12000,
      env: { NODE_ENV: "production" },
    },
    {
      name: "worker",
      script: "./node_modules/.bin/tsx",
      args: "src/worker.entry.ts",
      interpreter: "none",
      cwd: "/home/ubuntu/job-scheduler",
      kill_timeout: 12000,
      env: { NODE_ENV: "production" },
    },
  ],
};

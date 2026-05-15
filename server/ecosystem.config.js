module.exports = {
  apps: [
    {
      name: "collab-editor",
      script: "index.js",
      env: {
        NODE_ENV: "production",
      },
      // Restart on crash, up to 10 times within 1 minute
      max_restarts: 10,
      min_uptime: "5s",
    },
  ],
};

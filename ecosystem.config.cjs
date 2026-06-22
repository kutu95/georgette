/** PM2 config — run on server: cd /var/www/georgette-research && pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "georgette-research",
      cwd: __dirname,
      script: "node_modules/tsx/dist/cli.mjs",
      args: "server/index.ts",
      env: {
        NODE_ENV: "production",
        PORT: "3010",
      },
    },
  ],
};

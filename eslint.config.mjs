import nextConfig from "eslint-config-next";

const config = [
  { ignores: ["updated-design/**", "db-backups/**", ".q.mjs"] },
  ...nextConfig,
];

export default config;

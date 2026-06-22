// Metro configuré pour le monorepo (watch des packages partagés).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Surveiller tout le monorepo (pour @loone/shared).
config.watchFolders = [workspaceRoot];

// 2. Résoudre les modules depuis le projet puis la racine.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;

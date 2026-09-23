const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.blockList = [
  /.*[/\\]node_modules[/\\]expo-modules-core[/\\]expo-module-gradle-plugin[/\\]build[/\\]?.*/,
  /.*[/\\]node_modules[/\\]expo-modules-autolinking[/\\]android[/\\]expo-gradle-plugin[/\\]?.*/,
  /.*[/\\]node_modules[/\\]expo-updates[/\\]expo-updates-gradle-plugin[/\\]build[/\\]?.*/,
  /.*[/\\]android[/\\]app[/\\]build[/\\]?.*/,
];

config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;

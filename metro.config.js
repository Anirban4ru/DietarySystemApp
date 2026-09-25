const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /.*[/\\]node_modules[/\\]expo-modules-core[/\\]expo-module-gradle-plugin[/\\]build[/\\]?.*/,
  /.*[/\\]node_modules[/\\]expo-modules-autolinking[/\\]android[/\\]expo-gradle-plugin[/\\]?.*/,
  /.*[/\\]node_modules[/\\]expo-updates[/\\]expo-updates-gradle-plugin[/\\]build[/\\]?.*/,
  /.*[/\\]android[/\\]app[/\\]build[/\\]?.*/,
];

module.exports = config;

const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, '../packages')];
config.resolver.extraNodeModules = {
  '@app/shared': path.resolve(__dirname, '../packages/shared'),
};
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });

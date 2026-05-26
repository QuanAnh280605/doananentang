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

// Fix EMFILE "too many open files" error on Windows
config.maxWorkers = 2;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => middleware,
};

module.exports = withNativeWind(config, { input: './global.css' });

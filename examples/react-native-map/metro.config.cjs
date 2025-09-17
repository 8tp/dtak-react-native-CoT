const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

module.exports = async () => {
  const projectRoot = __dirname;
  const workspaceRoot = path.resolve(projectRoot, '..', '..');

  const config = await getDefaultConfig(projectRoot);
  config.watchFolders = [workspaceRoot];

  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    path: require.resolve('path-browserify')
  };

  config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'cjs'])];

  return config;
};

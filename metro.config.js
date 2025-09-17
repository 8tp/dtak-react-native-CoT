const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      // Polyfills for Node.js modules
      'crypto': 'crypto-js',
      'path': 'react-native-path',
      'fs': 'react-native-fs',
      'stream': 'readable-stream',
    },
    // Include proto files in the bundle
    assetExts: ['proto', 'xml'],
  },
  transformer: {
    // Allow importing of proto and xml files
    assetRegistryPath: 'react-native/Libraries/Image/AssetRegistry',
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

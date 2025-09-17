module.exports = {
  dependencies: {
    'react-native-fs': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-fs/android',
          packageImportPath: 'import io.github.douglasjunior.ReactNativeFSPackage;',
        },
        ios: {
          podspecPath: '../node_modules/react-native-fs/react-native-fs.podspec',
        },
      },
    },
    'react-native-zip-archive': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-zip-archive/android',
          packageImportPath: 'import com.rnziparchive.RNZipArchivePackage;',
        },
        ios: {
          podspecPath: '../node_modules/react-native-zip-archive/react-native-zip-archive.podspec',
        },
      },
    },
  },
  assets: ['./lib/types/', './lib/proto/'],
};

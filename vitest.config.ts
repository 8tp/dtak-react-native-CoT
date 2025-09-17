import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1'
    }
  },
  resolve: {
    alias: {
      'react-native-fs': new URL('./test/__mocks__/react-native-fs.ts', import.meta.url).pathname,
      'react-native': new URL('./test/__mocks__/react-native.ts', import.meta.url).pathname,
      'react-native-vision-camera': new URL('./test/__mocks__/react-native-vision-camera.ts', import.meta.url).pathname,
      'react-native-canvas': new URL('./test/__mocks__/react-native-canvas.ts', import.meta.url).pathname,
      'react-native-geolocation-service': new URL('./test/__mocks__/react-native-geolocation-service.ts', import.meta.url).pathname,
      '@react-native-async-storage/async-storage': new URL('./test/__mocks__/@react-native-async-storage/async-storage.ts', import.meta.url).pathname,
      'react-native-image-resizer': new URL('./test/__mocks__/react-native-image-resizer.ts', import.meta.url).pathname
    }
  }
})

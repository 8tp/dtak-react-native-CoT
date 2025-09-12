import { defineConfig } from 'vitest/config'

export default defineConfig({
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
      '@openaddresses/batch-error': new URL('./test/__mocks__/@openaddresses/batch-error.ts', import.meta.url).pathname,
      '@orbat-mapper/convert-symbology': new URL('./test/__mocks__/@orbat-mapper/convert-symbology.ts', import.meta.url).pathname
    }
  }
})

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
      'react-native-fs': new URL('./test/__mocks__/react-native-fs.ts', import.meta.url).pathname
    }
  }
})

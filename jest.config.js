module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        "module": "commonjs",
        "target": "es2022",
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "skipLibCheck": true,
        "verbatimModuleSyntax": false
      }
    }]
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^react-native-fs$': '<rootDir>/test/__mocks__/react-native-fs.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};

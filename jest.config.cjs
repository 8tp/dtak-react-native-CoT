module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/util.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
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
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^react-native-fs$': '<rootDir>/test/__mocks__/react-native-fs.ts',
    '^uuid$': '<rootDir>/test/__mocks__/uuid.ts',
    '^@openaddresses/batch-error$': '<rootDir>/test/__mocks__/@openaddresses/batch-error.ts',
    '^@orbat-mapper/convert-symbology$': '<rootDir>/test/__mocks__/@orbat-mapper/convert-symbology.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};

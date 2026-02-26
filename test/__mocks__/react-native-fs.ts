import * as nodefs from 'fs';
import * as nodepath from 'path';

// Mock for react-native-fs that delegates to Node.js fs for testing
const mockFS = {
  TemporaryDirectoryPath: '/tmp',
  DocumentDirectoryPath: '/documents',

  mkdir: jest.fn().mockImplementation(async (dirPath: string) => {
    nodefs.mkdirSync(dirPath, { recursive: true });
  }),
  readFile: jest.fn().mockImplementation(async (filePath: string, encoding?: string) => {
    return nodefs.readFileSync(filePath, (encoding || 'utf8') as BufferEncoding);
  }),
  writeFile: jest.fn().mockImplementation(async (filePath: string, content: string, _encoding?: string) => {
    nodefs.writeFileSync(filePath, content, 'utf8');
  }),
  exists: jest.fn().mockImplementation(async (filePath: string) => {
    return nodefs.existsSync(filePath);
  }),
  unlink: jest.fn().mockImplementation(async (filePath: string) => {
    nodefs.unlinkSync(filePath);
  }),
  readDir: jest.fn().mockImplementation(async (dirPath: string) => {
    const entries = nodefs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      path: nodepath.join(dirPath, entry.name),
      isFile: () => entry.isFile(),
      isDirectory: () => entry.isDirectory(),
      size: 0
    }));
  })
};

export default mockFS;
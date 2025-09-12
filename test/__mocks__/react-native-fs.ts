// Mock for react-native-fs to allow tests to run in Node.js environment
const mockFS = {
    TemporaryDirectoryPath: '/tmp',
    DocumentDirectoryPath: '/documents',
    
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('mock file content'),
    writeFile: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
    unlink: jest.fn().mockResolvedValue(undefined),
    readDir: jest.fn().mockResolvedValue([
        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
        { name: 'file2.txt', isFile: () => true, isDirectory: () => false }
    ])
};

export default mockFS;
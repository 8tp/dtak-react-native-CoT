// Mock implementation of react-native-fs
export const DocumentDirectoryPath = '/mock/documents';
export const ExternalDirectoryPath = '/mock/external';
export const ExternalStorageDirectoryPath = '/mock/external-storage';

export const readFile = async (filePath: string) => {
    // Mock XML content for cot-types.xml
    if (filePath.includes('cot-types.xml')) {
        return `<?xml version="1.0"?>
<types>
  <cot cot="a-f-G-E-V-E-B" full="Gnd/Equip/Vehic/Bridge" desc="BRIDGE" 2525b="SFGPEVEB-------" />
</types>`;
    }
    return 'mock-file-content';
};

export const writeFile = async () => true;
export const mkdir = async () => true;
export const exists = async () => true;
export const unlink = async () => true;
export const readDir = async () => [];

export default {
    DocumentDirectoryPath,
    ExternalDirectoryPath,
    ExternalStorageDirectoryPath,
    readFile,
    writeFile,
    mkdir: async () => true,
    exists,
    unlink,
    readDir
};
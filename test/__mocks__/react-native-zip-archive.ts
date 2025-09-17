// Mock for react-native-zip-archive in test environment
export const zip = async (_source: string, target: string) => {
    // Mock implementation for tests
    return target;
};
export const unzip = async (_source: string, target: string) => {
    return target;
};
export const unzipAssets = async () => {
    return true;
};
export const subscribe = () => {
    return 1;
};
export const unSubscribe = () => {
    // Mock implementation
};

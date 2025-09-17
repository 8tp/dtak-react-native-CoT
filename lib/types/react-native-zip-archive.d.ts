declare module 'react-native-zip-archive' {
    export function zip(source: string, target: string): Promise<string>;
    export function unzip(source: string, target: string): Promise<string>;
    export function unzipAssets(source: string, target: string): Promise<boolean>;
    export function subscribe(callback: (data: { progress: number; filePath: string }) => void): number;
    export function unSubscribe(token: number): void;
}

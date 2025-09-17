// TypeScript shims for React Native environment when building and testing in Node
// These declarations prevent TS errors for modules that are mocked in tests.

declare module 'react-native-vision-camera' {
  export class Camera {
    static getCameraPermissionStatus?: () => Promise<'granted' | 'denied' | 'blocked' | 'not-determined'>;
    static requestCameraPermission?: () => Promise<'granted' | 'denied' | boolean>;
    static getAvailableCameraDevices?: () => Promise<any[]>;
    takePhoto?: (options?: any) => Promise<any>;
  }
}

declare module 'react-native-geolocation-service' {
  const Geolocation: {
    getCurrentPosition: (
      success: (position: any) => void,
      error?: (error: any) => void,
      options?: any
    ) => void;
    requestAuthorization: (mode: 'whenInUse' | 'always') => Promise<'granted' | 'denied'>;
  };
  export default Geolocation;
}

declare module 'react-native-image-resizer' {
  const ImageResizer: {
    createResizedImage: (
      uri: string,
      width: number,
      height: number,
      format: 'JPEG' | 'PNG' | 'WEBP',
      quality: number,
      rotation?: number,
      outputPath?: string,
      keepMeta?: boolean,
      options?: any
    ) => Promise<{ uri: string; width: number; height: number }>;
  };
  export default ImageResizer;
}

declare module 'react-native-fs' {
  const RNFS: {
    DocumentDirectoryPath: string;
    mkdir: (path: string) => Promise<void>;
    copyFile: (from: string, to: string) => Promise<void>;
    unlink: (path: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    stat: (path: string) => Promise<{ size: number }>;
    getFSInfo: () => Promise<{ freeSpace: number }>;
    readFile: (path: string, encoding?: string) => Promise<string>;
    writeFile: (path: string, contents: string, encoding?: string) => Promise<void>;
  };
  export default RNFS;
}

declare module 'react-native-canvas' {
  export class Canvas {
    width: number;
    height: number;
    getContext: (type: '2d') => CanvasRenderingContext2D;
    toDataURL: (type?: string) => Promise<string>;
  }
  export interface CanvasRenderingContext2D {
    clearRect: (x: number, y: number, w: number, h: number) => void;
    beginPath: () => void;
    moveTo: (x: number, y: number) => void;
    lineTo: (x: number, y: number) => void;
    arc: (x: number, y: number, r: number, sAngle: number, eAngle: number) => void;
    rect: (x: number, y: number, w: number, h: number) => void;
    stroke: () => void;
    fill: () => void;
    fillText: (text: string, x: number, y: number) => void;
    setLineDash: (segments: number[]) => void;
    strokeStyle: any;
    lineWidth: number;
    fillStyle: any;
    globalAlpha: number;
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
  }
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  export default AsyncStorage;
}

// Minimal React type to satisfy type-only import usage avoidance
declare module 'react' {
  export type RefObject<T> = { current: T | null };
}

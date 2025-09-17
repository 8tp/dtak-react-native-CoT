export class Camera {
  static async getCameraPermissionStatus() { return 'granted' as const; }
  static async requestCameraPermission() { return 'granted' as const; }
  static async getAvailableCameraDevices() { return [{ id: 'mock-camera' }]; }
  async takePhoto(options?: unknown) {
    void options;
    return { path: '/mock/p.jpg', width: 1920, height: 1080, orientation: 0 };
  }
}
export default { Camera };

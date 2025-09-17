const Geolocation = {
  getCurrentPosition: (
    success: (pos: unknown) => void,
    error?: (err: unknown) => void,
    options?: unknown
  ) => {
    void error;
    void options;
    // Simulate async behavior
    setTimeout(() => {
      success({
        coords: { latitude: 37.7749, longitude: -122.4194, altitude: 10, accuracy: 5 },
        timestamp: Date.now()
      });
    }, 0);
  },
  async requestAuthorization(..._args: unknown[]) {
    void _args;
    return 'granted' as const;
  }
};

// Export both default and named exports
export default Geolocation;
export { Geolocation };

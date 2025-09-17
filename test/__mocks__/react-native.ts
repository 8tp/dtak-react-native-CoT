export const PermissionsAndroid = {
  PERMISSIONS: {
    ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION'
  },
  RESULTS: {
    GRANTED: 'granted'
  },
  async request(..._args: unknown[]) { 
    void _args;
    return 'granted' as const; 
  }
};

export const Platform = {
  OS: 'ios'
};

export default { PermissionsAndroid, Platform };

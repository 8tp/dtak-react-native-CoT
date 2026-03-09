// Mock @orbat-mapper/convert-symbology module for Jest testing
// Provides known conversions for test cases; falls back to passthrough
const KNOWN_CONVERSIONS: Record<string, string> = {
  'SFGPEVC--------': '10031500001601000000',
};

export const convertLetterSidc2NumberSidc = (sidc: string): { sidc: string } => {
  return { sidc: KNOWN_CONVERSIONS[sidc] || sidc };
};

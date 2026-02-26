// Mock uuid module for Jest testing
// Returns a deterministic UUID-format string (36 chars including hyphens)
let counter = 0;
export const v4 = (): string => {
    counter++;
    const hex = counter.toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${hex}`;
};
export default { v4 };

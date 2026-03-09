import MilSymType, { StandardIdentity } from '../lib/utils/2525.js';

describe('2525 StandardIdentity', () => {
    test('should return correct standard identity values', () => {
        expect(MilSymType.standardIdentity('b-f-D')).toBe(StandardIdentity.NONE);
        expect(MilSymType.standardIdentity('a-')).toBe(StandardIdentity.NONE);
        expect(MilSymType.standardIdentity('a-x-D-H')).toBe(StandardIdentity.NONE);
        expect(MilSymType.standardIdentity('a-h-S')).toBe(StandardIdentity.HOSTILE);
    });
});

describe('2525 <=> SIDC to2525B', () => {
    test('should convert CoT to 2525B format correctly', () => {
        expect(MilSymType.to2525B("a-h-S-C-L-D-D")).toBe("SHSPCLDD-------");
        expect(MilSymType.to2525B("a-f-G-U-C-V-R-A")).toBe("SFGPUCVRA------");
    });

    test('should throw errors for invalid CoT formats', () => {
        expect(() => {
            MilSymType.to2525B("b-h-S-C-L-D-D")
        }).toThrow(/CoT to 2525B can only be applied to well-formed Atom type CoT Events./);

        expect(() => {
            MilSymType.to2525B("")
        }).toThrow(/CoT to 2525B can only be applied to well-formed Atom type CoT Events./);

        expect(() => {
            MilSymType.to2525B("bhSCLDD")
        }).toThrow(/CoT to 2525B can only be applied to well-formed Atom type CoT Events./);

        expect(() => {
            MilSymType.to2525B("b-h-s-c-l-d-d")
        }).toThrow(/CoT to 2525B can only be applied to well-formed Atom type CoT Events./);

        expect(() => {
            MilSymType.to2525B("b-h-S-?-L-D-D")
        }).toThrow(/CoT to 2525B can only be applied to well-formed Atom type CoT Events./);
    });
});

describe('2525 <=> SIDC from2525B', () => {
    test('should convert 2525B to CoT format correctly', () => {
        expect(MilSymType.from2525B("SHSPCLDD-------")).toBe("a-h-S-C-L-D-D");
        expect(MilSymType.from2525B("SFGPUCVRA------")).toBe("a-f-G-U-C-V-R-A");
    });

    test('should throw errors for invalid 2525B formats', () => {
        expect(() => {
            MilSymType.from2525B("SFGPUCVRA")
        }).toThrow(/2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

        expect(() => {
            MilSymType.from2525B("SOGPUCVRA------")
        }).toThrow(/2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

        expect(() => {
            MilSymType.from2525B("SFMPUCVRA------")
        }).toThrow(/2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

        expect(() => {
            MilSymType.from2525B("SFGP*CVRA------")
        }).toThrow(/2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

        expect(() => {
            MilSymType.from2525B("GFGPUCVRA------")
        }).toThrow(/2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);
    });
});

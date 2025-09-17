import xmljs from 'xml-js';
import type { Static } from '@sinclair/typebox';
import TypeValidator from '../utils/type.js';
import MilSymType, { StandardIdentity, Domain } from '../utils/2525.js';
import { Type } from '@sinclair/typebox'

// Detect React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

let RNFS: any;
if (isReactNative) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        RNFS = require('react-native-fs');
    } catch {
        // React Native FS not available
    }
}

// Cross-platform file system wrapper
const fsp = {
    readFile: async (filePath: string): Promise<Buffer> => {
        if (isReactNative && RNFS) {
            const content = await RNFS.readFile(filePath, 'utf8');
            return Buffer.from(content, 'utf8');
        } else {
            // Use Node.js fs for test environment
            const fs = await import('fs');
            return await fs.promises.readFile(filePath);
        }
    }
};

export const AugmentedType = Type.Object({
    cot: Type.String(),
    desc: Type.String(),

    full: Type.Optional(Type.String()),

    '2525b': Type.Optional(Type.String())
});

export const TypeFormat_COT = Type.Object({
    cot: Type.String(),
    desc: Type.String(),
    full: Type.Optional(Type.String()),
})

export const TypeFormat_Weapon = Type.Object({
    cot: Type.String(),
    desc: Type.String()
})

export const TypeFormat_Relation = Type.Object({
    cot: Type.String(),
    desc: Type.String()
})

export const TypeFormat_Is = Type.Object({
    what: Type.String(),
    match: Type.String()
});

export const TypeFormat_How = Type.Object({
    what: Type.String(),
    value: Type.String()
})

export const TypeFormat = Type.Object({
    types: Type.Object({
        cot: Type.Array(Type.Object({
            _attributes: TypeFormat_COT
        })),
        weapon: Type.Array(Type.Object({
            _attributes: TypeFormat_Weapon
        })),
        relation: Type.Array(Type.Object({
            _attributes: TypeFormat_Relation
        })),
        is: Type.Array(Type.Object({
            _attributes: TypeFormat_Is
        })),
        how: Type.Array(Type.Object({
            _attributes: TypeFormat_How
        }))
    })
});

export default class CoTTypes {
    cots: Map<string, Static<typeof TypeFormat_COT>>
    weapons: Map<string, Static<typeof TypeFormat_Weapon>>
    relations: Map<string, Static<typeof TypeFormat_Relation>>
    is: Map<string, Static<typeof TypeFormat_Is>>
    how: Map<string, Static<typeof TypeFormat_How>>

    constructor(
        cots: Map<string, Static<typeof TypeFormat_COT>>,
        weapons: Map<string, Static<typeof TypeFormat_Weapon>>,
        relations: Map<string, Static<typeof TypeFormat_Relation>>,
        is: Map<string, Static<typeof TypeFormat_Is>>,
        how: Map<string, Static<typeof TypeFormat_How>>
    ) {
        this.cots = cots;
        this.weapons = weapons;
        this.relations = relations;
        this.is = is;
        this.how = how;
    }

    static async load(): Promise<CoTTypes> {
        // Resolve path to cot-types.xml relative to this module
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const xmlPath = path.join(__dirname, 'cot-types.xml');
        
        const xml = xmljs.xml2js(String(await fsp.readFile(xmlPath)), { compact: true })

        const types = TypeValidator.type(TypeFormat, xml);

        const cots: Map<string, Static<typeof TypeFormat_COT>> = new Map();
        for (const cot of types.types.cot) {
            cots.set(cot._attributes.cot, cot._attributes);
        }

        const weapons: Map<string, Static<typeof TypeFormat_Weapon>> = new Map();
        for (const weapon of types.types.weapon) {
            weapons.set(weapon._attributes.cot, weapon._attributes);
        }

        const relations: Map<string, Static<typeof TypeFormat_Relation>> = new Map();
        for (const relation of types.types.relation) {
            relations.set(relation._attributes.cot, relation._attributes);
        }

        const is: Map<string, Static<typeof TypeFormat_Is>> = new Map();
        for (const i of types.types.is) {
            is.set(i._attributes.what, i._attributes);
        }

        const how: Map<string, Static<typeof TypeFormat_How>> = new Map();
        for (const h of types.types.how) {
            how.set(h._attributes.value, h._attributes);
        }

        return new CoTTypes(cots, weapons, relations, is, how);
    }

    types(
        si: StandardIdentity,
        opts: {
            domain?: Domain
        } = {}
    ): Set<Static<typeof AugmentedType>> {
        if (!si) throw new TypeError('No StandardIdentity Parameter provided');

        const filtered: Set<Static<typeof AugmentedType>> = new Set();

        for (const cot of this.cots.values()) {
            if (opts.domain) {
                if (!cot.cot.startsWith(`${opts.domain}-`)) {
                    continue;
                };
            }

            if (cot.cot.match(/^a-\.-/)) {
                const type = cot.cot.replace(/^a-\.-/, `a-${si}-`);

                filtered.add({
                    ...cot,
                    cot: type,
                    '2525b': MilSymType.is2525BConvertable(type) ? MilSymType.to2525B(type) : undefined
                })
            } else {
                filtered.add({
                    ...cot,
                    '2525b': MilSymType.is2525BConvertable(cot.cot) ? MilSymType.to2525B(cot.cot) : undefined
                });
            }
        }

        return filtered;
    }
}

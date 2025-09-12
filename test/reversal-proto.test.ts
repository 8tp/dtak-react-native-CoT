import type { Static } from '@sinclair/typebox';
import type { Feature } from '../lib/types/feature.js';
import RNFS from 'react-native-fs';
import path from 'path';
import test from 'tape';
import CoT, { CoTParser } from '../index.js';

// React Native compatible fs wrapper
const fs = {
    readFile: async (filePath: string): Promise<Buffer> => {
        const content = await RNFS.readFile(filePath, 'utf8');
        return Buffer.from(content, 'utf8');
    },
    readdir: async (dirPath: string): Promise<string[]> => {
        const result = await RNFS.readDir(dirPath);
        return result.map(item => item.name);
    }
};

// React Native compatible directory resolution - you'd need to bundle these files
const fixturesDir = './test/fixtures/'; // This would need to be adjusted based on your React Native setup

for (const fixturename of await fs.readdir(fixturesDir)) {
    test(`Protobuf Reversal Tests: ${fixturename}`, async (t) => {
        const fixturePath = path.join(fixturesDir, fixturename);
        const fixture: Static<typeof Feature> = JSON.parse(String(await fs.readFile(fixturePath)));
        const geo = await CoTParser.from_geojson(fixture)
        const intermediate = await CoTParser.to_proto(geo);
        const output = await CoTParser.from_proto(intermediate);
        t.deepEquals(fixture, await CoTParser.to_geojson(output), fixturename);

        t.end();
    });
}

// Ref: https://github.com/dfpc-coe/node-CoT/issues/55
test('Protobuf Multiple Calls', async (t) => {
    const cot = new CoT({
        event: {
            _attributes: {
                version: '2.0',
                uid: 'ebbf42a7-ea71-43a1-baf6-e259c3d115bf',
                type: 'u-rb-a',
                how: 'h-e',
                time: '2024-08-30T22:28:02Z',
                start: '2024-08-30T22:28:02Z',
                stale: '2024-08-31T22:28:02Z',
                access: 'Undefined',
            },
            point: {
                _attributes: {
                    lat: 39.0981196,
                    lon: -108.7395013,
                    hae: 0.0,
                    ce: 9999999.0,
                    le: 9999999.0,
                },
            },
            detail: {
                contact: {
                    _attributes: {
                        callsign: 'sign',
                    },
                },
            },
        },
    })

    const cot2 = await CoTParser.from_proto(await CoTParser.to_proto(cot))
    t.deepEqual(cot2.raw.event.detail?.contact?._attributes.callsign, 'sign')
    const cot3 = await CoTParser.from_proto(await CoTParser.to_proto(cot))
    t.deepEqual(cot3.raw.event.detail?.contact?._attributes.callsign, 'sign')

    t.end();
});

import { CoTParser } from '../index.js';

test('COT Emergency - Troops in Contact', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            callsign: 'Example Emergency',
            type: 'b-a-o-opn',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-o-opn');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { type: 'Troops In Contact' },
            _text: 'Example Emergency'
        });
    }
});

test('COT Emergency - Troops in Contact - No Callsign', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            type: 'b-a-o-opn',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-o-opn');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { type: 'Troops In Contact' },
            _text: 'UNKNOWN'
        });
    }
});

test('COT Emergency - 911 Alert', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            callsign: 'Example Emergency',
            type: 'b-a-o-tbl',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-o-tbl');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { type: '911 Alert' },
            _text: 'Example Emergency'
        });
    }
});

test('COT Emergency - 911 Alert - No Callsign', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            type: 'b-a-o-tbl',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-o-tbl');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { type: '911 Alert' },
            _text: 'UNKNOWN'
        });
    }
});

test('COT Emergency - Cancel', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            callsign: 'Example Emergency',
            type: 'b-a-o-can',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-o-can');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { cancel: true },
            _text: 'Example Emergency'
        });
    }
});

test('COT Emergency - Cancel - No Callsign', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            type: 'b-a-o-can',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-o-can');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { cancel: true },
            _text: 'UNKNOWN'
        });
    }
});

test('COT Emergency - Ring The Bell', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            callsign: 'Example Emergency',
            type: 'b-a-o-pan',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-o-pan');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { type: 'Ring The Bell' },
            _text: 'Example Emergency'
        });
    }
});

test('COT Emergency - Ring The Bell - No Callsign', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            type: 'b-a-o-pan',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-o-pan');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { type: 'Ring The Bell' },
            _text: 'UNKNOWN'
        });
    }
});

test('COT Emergency - GeoFence Breached', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            callsign: 'Example Emergency',
            type: 'b-a-g',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-g');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { type: 'Geo-fence Breached' },
            _text: 'Example Emergency'
        });
    }
});

test('COT Emergency - GeoFence Breached - No Callsign', async () => {
    const cot = await CoTParser.from_geojson({
        id: '6da80127-44d4-4bf0-89bd-ecd326afaef1',
        type: 'Feature',
        properties: {
            type: 'b-a-g',
            how: 'm-g'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -108.547391197293, 38.5144413169673 ]
        }
    })

    if (!cot.raw.event.detail) {
        throw new Error('No Detail Section')
    } else {
        expect(cot.raw.event.detail['_flow-tags_']).toBeTruthy();
        delete cot.raw.event.detail['_flow-tags_'];

        expect(cot.type()).toEqual('b-a-g');

        expect(cot.raw.event.detail.emergency).toEqual({
            _attributes: { type: 'Geo-fence Breached' },
            _text: 'UNKNOWN'
        });
    }
});

import { CoTParser } from '../index.js';

test('await CoTParser.from_xml - Invalid', async () => {
    try {
        await CoTParser.from_xml('<not-cot-xml test="1"/>');
        throw new Error('Shoult not parse invalid CoT XML');
    } catch (err) {
        expect(String(err).includes('Cannot read properties of undefined')).toBeTruthy();
    }

});

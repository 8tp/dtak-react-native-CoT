import protobuf from 'protobufjs';
import Err from '@openaddresses/batch-error';
import { xml2js, js2xml } from 'xml-js';
import { diff } from 'json-diff-ts';
import type { Static } from '@sinclair/typebox';
import { from_geojson } from './parser/from_geojson.js';
import { normalize_geojson } from './parser/normalize_geojson.js';
import { to_geojson } from './parser/to_geojson.js';
import type {
    Feature,
} from './types/feature.js';
import type {
    GeoJSONFeature,
} from './types/geojson.js';
import {
    InputFeature,
} from './types/feature.js';
import JSONCoT, { Detail } from './types/types.js'
import CoT from './cot.js';
import type { CoTOptions } from './cot.js';
import AJV from 'ajv';

// React Native compatible protobuf loading
// For React Native, we need to load protobuf definitions differently
let RootMessage: protobuf.Root;

// Check if we're in a React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

if (isReactNative) {
    // In React Native, create an empty root for now
    // In a real React Native app, you would bundle the proto files as assets
    RootMessage = new protobuf.Root();
    console.warn('Protobuf definitions not loaded in React Native environment. Some functionality may be limited.');
} else {
    // In Node.js environment, try to load the proto files
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path');
        const protoDir = path.join(__dirname, 'proto');
        
        // Load all proto files in the correct order to handle imports
        RootMessage = new protobuf.Root();
        RootMessage.resolvePath = (origin: string, target: string) => {
            return path.join(protoDir, target);
        };
        
        // Load the main proto file which will automatically load imports
        const protoPath = path.join(protoDir, 'takmessage.proto');
        RootMessage = protobuf.loadSync(protoPath);
    } catch (error) {
        console.warn('Failed to load protobuf definitions:', error);
        RootMessage = new protobuf.Root();
    }
}

// For React Native, package.json reading would need to be handled differently
const pkg = { version: '14.7.9' }; // Hardcoded for now, or read from a bundled file

const checkXML = (new AJV({
    allErrors: true,
    coerceTypes: true,
    allowUnionTypes: true
}))
    .compile(JSONCoT);

/**
 * Convert to and from an XML CoT message
 * @class
 *
 * @param cot A string/buffer containing the XML representation or the xml-js object tree
 *
 * @prop raw Raw XML-JS representation of CoT
 */
export class CoTParser {
    static validate(
        cot: CoT,
        opts: {
            flow: boolean
        } = {
                flow: true
            }
    ): CoT {
        if (opts.flow === undefined) opts.flow = true;

        checkXML(cot.raw);
        if (checkXML.errors) throw new Err(400, null, `${checkXML.errors[0].message} (${checkXML.errors[0].instancePath})`);

        if (opts.flow) {
            if (!cot.raw.event.detail) cot.raw.event.detail = {};

            if (!cot.raw.event.detail['_flow-tags_']) {
                cot.raw.event.detail['_flow-tags_'] = {};
            }

            cot.raw.event.detail['_flow-tags_'][`NodeCoT-${pkg.version}`] = new Date().toISOString()
        }

        return cot;
    }

    /**
     * Detect difference between CoT messages
     * Note: This diffs based on GeoJSON Representation of message
     *       So if unknown properties are present they will be excluded from the diff
     */
    static async isDiff(
        aCoT: CoT,
        bCoT: CoT,
        opts = {
            diffMetadata: false,
            diffStaleStartTime: false,
            diffDest: false,
            diffFlow: false
        }
    ): Promise<boolean> {
        const a = await this.to_geojson(aCoT) as Static<typeof InputFeature>;
        const b = await this.to_geojson(bCoT) as Static<typeof InputFeature>;

        if (!opts.diffDest) {
            delete a.properties.dest;
            delete b.properties.dest;
        }

        if (!opts.diffMetadata) {
            delete a.properties.metadata;
            delete b.properties.metadata;
        }

        if (!opts.diffFlow) {
            delete a.properties.flow;
            delete b.properties.flow;
        }

        if (!opts.diffStaleStartTime) {
            delete a.properties.time;
            delete a.properties.stale;
            delete a.properties.start;
            delete b.properties.time;
            delete b.properties.stale;
            delete b.properties.start;
        }

        const diffs = diff(a, b);

        return diffs.length > 0;
    }


    static from_xml(
        raw: Buffer | string,
        opts: CoTOptions = {}
    ): CoT {
        const cot = new CoT(
            xml2js(String(raw), { compact: true }) as Static<typeof JSONCoT>,
            opts
        );

        return this.validate(cot);
    }

    static to_xml(cot: CoT): string {
        return js2xml(cot.raw, { compact: true });
    }

    /**
     * Return an ATAK Compliant Protobuf
     */
    static async to_proto(cot: CoT, version = 1): Promise<Uint8Array> {
        if (version < 1 || version > 1) throw new Err(400, null, `Unsupported Proto Version: ${version}`);
        
        let ProtoMessage;
        try {
            ProtoMessage = RootMessage.lookupType(`atakmap.commoncommo.protobuf.v${version}.TakMessage`);
        } catch (error) {
            throw new Err(400, null, `Protobuf definitions not available: ${error}`);
        }

        // The spread operator is important to make sure the delete doesn't modify the underlying detail object
        const detail = { ...cot.raw.event.detail };

        const msg: any = {
            cotEvent: {
                ...cot.raw.event._attributes,
                sendTime: new Date(cot.raw.event._attributes.time).getTime(),
                startTime: new Date(cot.raw.event._attributes.start).getTime(),
                staleTime: new Date(cot.raw.event._attributes.stale).getTime(),
                ...cot.raw.event.point._attributes,
                detail: {
                    xmlDetail: ''
                }
            }
        };

        let key: keyof Static<typeof Detail>;
        for (key in detail) {
            if (['contact', 'group', 'precisionlocation', 'status', 'takv', 'track'].includes(key)) {
                msg.cotEvent.detail[key] = detail[key]._attributes;
                delete detail[key]
            }
        }
        
        // Preserve important detail elements that have special meaning
        const preservedElements = ['archive', 'shape', 'strokeColor', 'strokeWeight', 'strokeStyle', 'fillColor', 'labels'];
        for (const elem of preservedElements) {
            if ((detail as any)[elem]) {
                // Keep these elements in detail for xmlDetail serialization
                // They will be properly reconstructed during from_proto
            }
        }

        // Include all remaining detail properties and metadata in xmlDetail
        const xmlDetailContent = {
            ...detail,
            metadata: cot.metadata || {}
        };
        
        // Only add xmlDetail if there's actual content to serialize
        if (Object.keys(xmlDetailContent).length > 0 || Object.keys(cot.metadata || {}).length > 0) {
            try {
                // Wrap content in a root element to ensure valid XML
                const wrappedContent = { detail: xmlDetailContent };
                msg.cotEvent.detail.xmlDetail = js2xml(wrappedContent, { 
                    compact: true,
                    ignoreDeclaration: true,
                    ignoreInstruction: true,
                    ignoreComment: true,
                    ignoreDoctype: true
                });
            } catch (error) {
                console.warn('Failed to serialize xmlDetail:', error);
                msg.cotEvent.detail.xmlDetail = '';
            }
        }

        return ProtoMessage.encode(msg).finish();
    }

    /**
     * Return a GeoJSON Feature from an XML CoT message
     */
    static async to_geojson(cot: CoT): Promise<Static<typeof Feature>> {
        return await to_geojson(cot);
    }

    /**
     * Parse an ATAK compliant Protobuf to a JS Object
     */
    static async from_proto(
        raw: Uint8Array,
        version = 1,
        opts: CoTOptions = {}
    ): Promise<CoT> {
        let ProtoMessage;
        try {
            ProtoMessage = RootMessage.lookupType(`atakmap.commoncommo.protobuf.v${version}.TakMessage`);
        } catch (error) {
            throw new Err(400, null, `Protobuf definitions not available: ${error}`);
        }

        // Decode protobuf message - protobuf types are complex, using any for now
        const msg: any = ProtoMessage.decode(raw);

        if (!msg.cotEvent) throw new Err(400, null, 'No cotEvent Data');

        const detail: Record<string, any> = {};
        const metadata: Record<string, unknown> = {};
        for (const key in msg.cotEvent.detail) {
            if (key === 'xmlDetail') {
                try {
                    // Clean up the XML data before parsing
                    let xmlData = msg.cotEvent.detail[key];
                    if (typeof xmlData === 'string') {
                        // Remove any trailing null bytes, control characters, and invalid XML chars
                        // eslint-disable-next-line no-control-regex
                        xmlData = xmlData.replace(/[\0\x01-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, '').trim();
                        
                        // Ensure the XML has a proper root element if it doesn't already
                        if (xmlData && !xmlData.startsWith('<')) {
                            xmlData = `<root>${xmlData}</root>`;
                        }
                        
                        if (xmlData) {
                            const xml: any = xml2js(xmlData, { 
                                compact: true,
                                ignoreDeclaration: true,
                                ignoreInstruction: true,
                                ignoreComment: true,
                                ignoreDoctype: true,
                                sanitize: true
                            });
                            
                            // Handle wrapped content structure
                            if (xml.detail) {
                                // Content was wrapped in detail element during serialization
                                Object.assign(detail, xml.detail);
                            } else if (xml.root) {
                                // If we added a root wrapper, unwrap it
                                Object.assign(detail, xml.root);
                            } else {
                                Object.assign(detail, xml);
                            }
                            
                            // Handle special reconstructions for known elements
                            if (detail.archive) {
                                // Convert archive element back to archived property for to_geojson
                                detail.archived = true;
                            }
                        }
                    }
                } catch (xmlError) {
                    console.warn('Failed to parse xmlDetail:', xmlError);
                    // Skip invalid XML data rather than failing the entire parse
                }

                if (detail.metadata) {
                    // Handle metadata reconstruction properly
                    if (typeof detail.metadata === 'object') {
                        for (const key in detail.metadata) {
                            if (detail.metadata[key] && typeof detail.metadata[key] === 'object') {
                                metadata[key] = detail.metadata[key]._text || detail.metadata[key];
                            } else {
                                metadata[key] = detail.metadata[key];
                            }
                        }
                    }
                    delete detail.metadata;
                }
            } else if (key === 'group') {
                if (msg.cotEvent.detail[key]) {
                    detail.__group = { _attributes: msg.cotEvent.detail[key] };
                }
            } else if (['contact', 'precisionlocation', 'status', 'takv', 'track'].includes(key)) {
                if (msg.cotEvent.detail[key]) {
                    detail[key] = { _attributes: msg.cotEvent.detail[key] };
                }
            }
        }

        const cot = new CoT({
            event: {
                _attributes: {
                    version: '2.0',
                    uid: msg.cotEvent.uid, type: msg.cotEvent.type, how: msg.cotEvent.how,
                    qos: msg.cotEvent.qos, opex: msg.cotEvent.opex, access: msg.cotEvent.access,
                    time: new Date(msg.cotEvent.sendTime.toNumber()).toISOString(),
                    start: new Date(msg.cotEvent.startTime.toNumber()).toISOString(),
                    stale: new Date(msg.cotEvent.staleTime.toNumber()).toISOString(),
                },
                detail,
                point: {
                    _attributes: {
                        lat: msg.cotEvent.lat,
                        lon: msg.cotEvent.lon,
                        hae: msg.cotEvent.hae,
                        le: msg.cotEvent.le,
                        ce: msg.cotEvent.ce,
                    },
                }
            }
        }, opts);

        cot.metadata = metadata;

        return this.validate(cot);
    }

    static async normalize_geojson(
        feature: Static<typeof GeoJSONFeature>
    ): Promise<Static<typeof Feature>> {
        const feat = await normalize_geojson(feature);
        return feat;
    }

    /**
     * Return an CoT Message given a GeoJSON Feature
     *
     * @param {Object} feature GeoJSON Point Feature
     *
     * @return {CoT}
     */
    static async from_geojson(
        feature: Static<typeof InputFeature>,
        opts: CoTOptions = {}
    ): Promise<CoT> {
        const cot = await from_geojson(feature, opts);

        return this.validate(cot);
    }
}

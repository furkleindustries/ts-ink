import { DebugMetadata } from '../DebugMetadata';
export declare class DebugSourceRange {
    readonly length: number;
    readonly debugMetadata: DebugMetadata;
    text: string;
    constructor(length: number, debugMetadata: DebugMetadata, text: string);
}

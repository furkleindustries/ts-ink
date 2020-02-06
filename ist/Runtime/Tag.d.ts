import { RuntimeObject } from './Object';
export declare class RuntimeTag extends RuntimeObject {
    readonly text: string;
    constructor(text: string);
    readonly ToString: () => string;
}

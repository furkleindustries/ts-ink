import { Object } from './Object';
import { RuntimeObject } from '../../../Runtime/Object';
export declare class Text extends Object {
    text: string;
    constructor(text: string);
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly ToString: () => string;
}

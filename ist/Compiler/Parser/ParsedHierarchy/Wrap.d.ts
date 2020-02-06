import { Object } from './Object';
import { RuntimeObject } from '../../../Runtime/Object';
export declare class Wrap<T extends RuntimeObject> extends Object {
    private _objToWrap;
    constructor(_objToWrap: T);
    readonly GenerateRuntimeObject: () => RuntimeObject;
}

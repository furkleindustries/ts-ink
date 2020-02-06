import { RuntimeContainer } from './Container';
import { RuntimeObject } from './Object';
import { RuntimePath } from './Path';
export declare class Pointer {
    container: RuntimeContainer;
    index: number;
    constructor(container?: RuntimeContainer, index?: number);
    readonly Resolve: () => RuntimeObject;
    get isNull(): boolean;
    get path(): RuntimePath;
    readonly ToString: () => string;
    static readonly StartOf: (container: RuntimeContainer) => Pointer;
    static readonly Null: any;
}

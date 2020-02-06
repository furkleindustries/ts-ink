import { RuntimeContainer } from '../../../Runtime/Container';
import { Object } from './Object';
import { RuntimeObject } from '../../../Runtime/Object';
export declare class ContentList extends Object {
    dontFlatten: boolean;
    get runtimeContainer(): RuntimeContainer;
    constructor(objects?: Object[], ...moreObjects: Object[]);
    readonly TrimTrailingWhitespace: () => void;
    readonly GenerateRuntimeObject: () => RuntimeObject;
    ToString: () => string;
}

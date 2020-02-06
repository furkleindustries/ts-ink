import { RuntimeContainer } from './Container';
import { RuntimeObject } from './Object';
export declare class SearchResult {
    readonly obj: RuntimeObject;
    readonly approximate: boolean;
    get container(): RuntimeContainer;
    get correctObj(): RuntimeObject;
    constructor(obj: RuntimeObject, approximate: boolean);
}

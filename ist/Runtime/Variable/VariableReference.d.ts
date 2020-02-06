import { RuntimeContainer } from '../Container';
import { RuntimeObject } from '../Object';
import { RuntimePath } from '../Path';
export declare class RuntimeVariableReference extends RuntimeObject {
    name: string;
    pathForCount: RuntimePath;
    get containerForCount(): RuntimeContainer;
    get pathStringForCount(): string;
    set pathStringForCount(value: string);
    constructor(name?: string);
    readonly ToString: () => string;
}

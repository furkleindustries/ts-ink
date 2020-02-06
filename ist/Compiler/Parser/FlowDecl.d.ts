import { Argument } from './ParsedHierarchy/Argument';
export declare class FlowDecl {
    readonly name: string;
    readonly args: Argument[];
    readonly isFunction: boolean;
    constructor(name: string, args: Argument[], isFunction: boolean);
}

import { RuntimeContainer } from '../../../../Runtime/Container';
import { Expression } from '../Expression/Expression';
export declare class List extends Expression {
    readonly itemNameList: string[];
    constructor(itemNameList: string[]);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
}

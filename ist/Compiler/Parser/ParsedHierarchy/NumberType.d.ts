import { RuntimeContainer } from '../../../Runtime/Container';
import { Expression } from './Expression/Expression';
export declare class NumberType extends Expression {
    value: number;
    constructor(value: number);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
    readonly ToString: () => string;
}

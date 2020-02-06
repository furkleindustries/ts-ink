import { RuntimeContainer } from '../../../../Runtime/Container';
import { Expression } from './Expression';
export declare class UnaryExpression extends Expression {
    readonly op: string;
    get nativeNameForOp(): string;
    innerExpression: Expression;
    static readonly WithInner: (inner: Expression, op: string) => number | Expression;
    constructor(inner: Expression, op: string);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
    readonly ToString: () => string;
}

import { RuntimeContainer } from '../../../../Runtime/Container';
import { Expression } from './Expression';
import { Story } from '../Story';
export declare class BinaryExpression extends Expression {
    opName: string;
    readonly leftExpression: Expression;
    readonly rightExpression: Expression;
    constructor(left: Expression, right: Expression, opName: string);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
    ResolveReferences: (context: Story) => void;
    readonly NativeNameForOp: (opName: string) => string;
    readonly ToString: () => string;
}

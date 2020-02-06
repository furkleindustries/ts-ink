import { RuntimeContainer } from '../../../../Runtime/Container';
import { Expression } from './Expression';
import { Story } from '../Story';
export declare class IncDecExpression extends Expression {
    readonly varName: string;
    private _runtimeAssignment;
    isInc: boolean;
    expression: Expression;
    constructor(varName: string, isIncOrExpression: boolean | Expression, isInc?: boolean);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
    readonly ResolveReferences: (context: Story) => void;
    get incrementDecrementWord(): 'increment' | 'decrement';
    readonly ToString: () => string;
}

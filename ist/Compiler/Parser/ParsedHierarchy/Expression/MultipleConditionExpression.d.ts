import { RuntimeContainer } from '../../../../Runtime/Container';
import { Expression } from './Expression';
export declare class MultipleConditionExpression extends Expression {
    get subExpressions(): Expression[];
    constructor(conditionExpressions: Expression[]);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
}

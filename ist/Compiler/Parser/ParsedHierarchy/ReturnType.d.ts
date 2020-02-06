import { Expression } from './Expression/Expression';
import { Object } from './Object';
import { RuntimeObject } from '../../../Runtime/Object';
export declare class ReturnType extends Object {
    returnedExpression: Expression;
    constructor(returnedExpression?: Expression);
    readonly GenerateRuntimeObject: () => RuntimeObject;
}

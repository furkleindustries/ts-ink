import { Expression } from '../Expression/Expression';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
import { Story } from '../Story';
export declare class ConstantDeclaration extends Object {
    readonly constantName: string;
    readonly expression: Expression;
    constructor(constantName: string, assignedExpression: Expression);
    readonly GenerateRuntimeObject: () => RuntimeObject;
    ResolveReferences: (context: Story) => void;
    get typeName(): string;
}

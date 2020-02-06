import { Expression } from '../Expression/Expression';
import { ListDefinition } from '../List/ListDefinition';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
import { Story } from '../Story';
export declare class VariableAssignment extends Object {
    private _runtimeAssignment;
    readonly variableName: string;
    readonly expression: Expression;
    readonly listDefinition: ListDefinition;
    readonly isGlobalDeclaration: boolean;
    readonly isNewTemporaryDeclaration: boolean;
    get typeName(): "temp" | "VAR" | "variable assignment";
    get isDeclaration(): boolean;
    constructor({ assignedExpression, isGlobalDeclaration, isTemporaryNewDeclaration, listDef, variableName, }: {
        readonly assignedExpression?: Expression;
        readonly isGlobalDeclaration?: boolean;
        readonly isTemporaryNewDeclaration?: boolean;
        readonly listDef?: ListDefinition;
        readonly variableName: string;
    });
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly ResolveReferences: (context: Story) => void;
}

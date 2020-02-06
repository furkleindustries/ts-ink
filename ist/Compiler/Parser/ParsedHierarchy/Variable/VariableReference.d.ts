import { RuntimeContainer } from '../../../../Runtime/Container';
import { Expression } from '../Expression/Expression';
import { Story } from '../Story';
import { RuntimeVariableReference } from '../../../../Runtime/Variable/VariableReference';
export declare class VariableReference extends Expression {
    readonly path: string[];
    private _runtimeVarRef;
    get name(): string;
    isConstantReference: boolean;
    isListItemReference: boolean;
    get runtimeVarRef(): RuntimeVariableReference;
    constructor(path: string[]);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
    readonly ResolveReferences: (context: Story) => void;
    readonly ToString: () => string;
}

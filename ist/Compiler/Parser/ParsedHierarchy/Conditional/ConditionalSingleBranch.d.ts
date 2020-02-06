import { RuntimeContainer } from '../../../../Runtime/Container';
import { RuntimeDivert } from '../../../../Runtime/Divert/Divert';
import { Expression } from '../Expression/Expression';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
import { Story } from '../Story';
import { Weave } from '../Weave';
export declare class ConditionalSingleBranch extends Object {
    _contentContainer: RuntimeContainer;
    _conditionalDivert: RuntimeDivert;
    _ownExpression: Expression;
    _innerWeave: Weave;
    isTrueBranch: boolean;
    get ownExpression(): Expression;
    set ownExpression(value: Expression);
    matchingEquality: boolean;
    isElse: boolean;
    isInline: boolean;
    returnDivert: RuntimeDivert;
    constructor(content: Object[]);
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly GenerateRuntimeForContent: () => RuntimeContainer;
    readonly ResolveReferences: (context: Story) => void;
}

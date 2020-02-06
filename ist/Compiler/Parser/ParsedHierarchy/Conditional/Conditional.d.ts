import { ConditionalSingleBranch } from './ConditionalSingleBranch';
import { Expression } from '../Expression/Expression';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
import { Story } from '../Story';
export declare class Conditional extends Object {
    initialCondition: Expression;
    branches: ConditionalSingleBranch[];
    private _reJoinTarget;
    constructor(initialCondition: Expression, branches: ConditionalSingleBranch[]);
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly ResolveReferences: (context: Story) => void;
}

import { RuntimeObject } from '../Object';
import { Pointer } from '../Pointer';
import { PushPopType } from '../PushPopType';
export declare class CallStackElement {
    readonly type: PushPopType;
    currentPointer: Pointer;
    inExpressionEvaluation: boolean;
    temporaryVariables: Record<string, RuntimeObject>;
    evaluationStackHeightWhenPushed: number;
    functionStartInOuputStream: number;
    constructor(type: PushPopType, currentPointer: Pointer, inExpressionEvaluation?: boolean);
    readonly Copy: () => CallStackElement;
}

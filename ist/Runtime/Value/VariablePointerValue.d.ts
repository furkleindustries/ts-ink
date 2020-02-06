import { Value } from './Value';
import { ValueType } from './ValueType';
export declare class VariablePointerValue extends Value<string> {
    get variableName(): string;
    set variableName(value: string);
    get valueType(): ValueType;
    get isTruthy(): boolean;
    contextIndex: number;
    constructor(variableName: string, contextIndex?: number);
    readonly Cast: (newType: ValueType) => VariablePointerValue;
    readonly ToString: () => string;
    readonly Copy: () => VariablePointerValue;
}

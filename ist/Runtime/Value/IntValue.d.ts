import { Value } from './Value';
import { ValueType } from './ValueType';
export declare class IntValue extends Value<number> {
    get valueType(): ValueType;
    get isTruthy(): boolean;
    constructor(intVal?: number);
    readonly Cast: (newType: ValueType) => Value<import("./UnderlyingValueTypes").UnderlyingValueTypes>;
}

import { Value } from './Value';
import { ValueType } from './ValueType';
export declare class FloatValue extends Value<number> {
    get valueType(): ValueType;
    get isTruthy(): boolean;
    constructor(val?: number);
    readonly Cast: (newType: ValueType) => Value<import("./UnderlyingValueTypes").UnderlyingValueTypes>;
}

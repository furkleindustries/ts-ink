import { Value } from './Value';
import { ValueType } from './ValueType';
export declare class StringValue extends Value<string> {
    get valueType(): ValueType;
    get isTruthy(): boolean;
    isNewline: boolean;
    isInlineWhitespace: boolean;
    get isNonWhitespace(): boolean;
    constructor(str?: string);
    Cast: (newType: ValueType) => Value<import("./UnderlyingValueTypes").UnderlyingValueTypes>;
}

import { RuntimeObject } from '../Object';
import { UnderlyingValueTypes } from './UnderlyingValueTypes';
import { ValueType } from './ValueType';
export declare abstract class Value<T extends UnderlyingValueTypes = UnderlyingValueTypes> extends RuntimeObject {
    protected _value: T;
    abstract valueType: ValueType;
    abstract isTruthy: boolean;
    abstract readonly Cast: (newType: ValueType) => Value;
    static readonly Create: (val: any) => Value<UnderlyingValueTypes>;
    static readonly RetainListOriginsForAssignment: (oldValue: RuntimeObject, newValue: RuntimeObject) => void;
    readonly Copy: () => Value<UnderlyingValueTypes>;
    readonly BadCastException: (targetType: ValueType) => Error;
    get value(): T;
    set value(value: T);
    get valueObject(): T;
    constructor(_value: T);
    readonly ToString: () => string;
}

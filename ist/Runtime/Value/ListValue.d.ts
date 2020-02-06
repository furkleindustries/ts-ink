import { RuntimeInkList } from '../List/InkList';
import { ListKeyValuePair } from '../List/ListKeyValuePair';
import { Value } from './Value';
import { ValueType } from './ValueType';
export declare class ListValue extends Value<RuntimeInkList> {
    get valueType(): ValueType;
    get isTruthy(): boolean;
    readonly Cast: (newType: ValueType) => Value<import("./UnderlyingValueTypes").UnderlyingValueTypes>;
    constructor({ list, singleItem, singleValue, }?: {
        list?: RuntimeInkList;
        singleItem?: ListKeyValuePair;
        singleValue?: number;
    });
}

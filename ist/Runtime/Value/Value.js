import { DivertTargetValue, } from './DivertTargetValue';
import { FloatValue, } from './FloatValue';
import { RuntimeInkList, } from '../List/InkList';
import { IntValue, } from './IntValue';
import { ListValue, } from './ListValue';
import { RuntimePath, } from '../Path';
import { RuntimeObject, } from '../Object';
import { StringValue, } from './StringValue';
export class Value extends RuntimeObject {
    constructor(_value) {
        super();
        this._value = _value;
        this.Copy = () => (Value.Create(this.valueObject));
        this.BadCastException = (targetType) => (new Error(`Can't cast ${this.valueObject} from ${this.valueType} to ${targetType}`));
        this.ToString = () => ('ToString' in this.value ? this.value.ToString() : String(this.value));
    }
    get value() {
        return this._value;
    }
    set value(value) {
        this._value = value;
    }
    get valueObject() {
        return this.value;
    }
}
Value.Create = (val) => {
    let value = val;
    if (typeof value === 'number' && !Number.isNaN(value)) {
        if (value % 1 === 0) {
            return new IntValue(value);
        }
        return new FloatValue(value);
    }
    else if (typeof value === 'boolean') {
        ;
        // Implicitly convert bools into ints
        return new IntValue(Number(value));
    }
    else if (typeof value === 'string') {
        return new StringValue(value);
    }
    else if (value instanceof RuntimePath) {
        return new DivertTargetValue(value);
    }
    else if (value instanceof RuntimeInkList) {
        return new ListValue({ list: value });
    }
    return null;
};
Value.RetainListOriginsForAssignment = (oldValue, newValue) => {
    const oldList = oldValue;
    const newList = newValue;
    // When assigning the emtpy list, try to retain any initial origin names
    if (oldList && newList && newList.value.Size() === 0) {
        newList.value.SetInitialOriginNames(oldList.value.originNames);
    }
};
//# sourceMappingURL=Value.js.map
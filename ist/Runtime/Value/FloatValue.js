import { IntValue, } from './IntValue';
import { StringValue, } from './StringValue';
import { Value, } from './Value';
import { ValueType, } from './ValueType';
export class FloatValue extends Value {
    constructor(val = 0) {
        super(val);
        this.Cast = (newType) => {
            if (newType === this.valueType) {
                return this;
            }
            else if (newType === ValueType.Int) {
                return new IntValue(this.value);
            }
            if (newType == ValueType.String) {
                const val = typeof this.value === 'object' && 'ToString' in this.value ?
                    this.value.ToString() :
                    String(this.value);
                return new StringValue(val);
            }
            throw new Error(`Bad cast exception: ${newType}`);
        };
    }
    get valueType() {
        return ValueType.Float;
    }
    get isTruthy() {
        return this.value !== 0;
    }
}
//# sourceMappingURL=FloatValue.js.map
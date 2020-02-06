import { FloatValue, } from './FloatValue';
import { StringValue, } from './StringValue';
import { Value, } from './Value';
import { ValueType, } from './ValueType';
export class IntValue extends Value {
    constructor(intVal = 0) {
        super(intVal);
        this.Cast = (newType) => {
            if (newType === this.valueType) {
                return this;
            }
            else if (newType === ValueType.Float) {
                return new FloatValue(Number(this.value));
            }
            else if (newType == ValueType.String) {
                return new StringValue(String(this.value));
            }
            throw new Error(`Bad cast exception: ${newType}`);
        };
    }
    get valueType() {
        return ValueType.Int;
    }
    get isTruthy() {
        return this.value !== 0;
    }
}
//# sourceMappingURL=IntValue.js.map
import { Value, } from './Value';
import { ValueType, } from './ValueType';
// TODO: Think: Erm, I get that this contains a string, but should
// we really derive from Value<string>? That seems a bit misleading to me.
export class VariablePointerValue extends Value {
    constructor(variableName, contextIndex = -1) {
        super(variableName);
        this.Cast = (newType) => {
            if (newType === this.valueType) {
                return this;
            }
            throw new Error(`Bad cast exception: ${newType}`);
        };
        this.ToString = () => (`VariablePointerValue(${this.variableName})`);
        this.Copy = () => (new VariablePointerValue(this.variableName, this.contextIndex));
        this.contextIndex = contextIndex;
    }
    get variableName() {
        return this.value;
    }
    set variableName(value) {
        this.value = value;
    }
    get valueType() {
        return ValueType.VariablePointer;
    }
    get isTruthy() {
        throw Error('Shouldn\'t be checking the truthiness of a variable pointer');
    }
}
//# sourceMappingURL=VariablePointerValue.js.map
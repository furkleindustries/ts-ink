import { Value, } from './Value';
import { ValueType, } from './ValueType';
export class DivertTargetValue extends Value {
    constructor(targetPath = null) {
        super(targetPath);
        this.Cast = (newType) => {
            if (newType === this.valueType) {
                return this;
            }
            throw new Error(`Bad cast exception: ${newType}`);
        };
        this.ToString = () => (`DivertTargetValue(${this.targetPath})`);
    }
    get targetPath() {
        return this.value;
    }
    set targetPath(value) {
        this.value = value;
    }
    get valueType() {
        return ValueType.DivertTarget;
    }
    get isTruthy() {
        throw new Error('Shouldn\'t be checking the truthiness of a divert target');
    }
}
//# sourceMappingURL=DivertTargetValue.js.map
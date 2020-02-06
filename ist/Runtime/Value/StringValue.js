import { FloatValue, } from './FloatValue';
import { IntValue, } from './IntValue';
import { Value, } from './Value';
import { ValueType, } from './ValueType';
export class StringValue extends Value {
    constructor(str = '') {
        super(str);
        this.Cast = (newType) => {
            if (newType == this.valueType) {
                return this;
            }
            if (newType === ValueType.Int) {
                const parsedNum = Number(this.value);
                if (!Number.isNaN(parsedNum)) {
                    return new IntValue(parsedNum);
                }
                return null;
            }
            if (newType === ValueType.Float) {
                const parsedFloat = Number(this.value);
                if (!Number.isNaN(parsedFloat)) {
                    return new FloatValue(parsedFloat);
                }
                return null;
            }
            throw new Error(`Bad cast exception: ${newType}`);
        };
        // Classify whitespace status
        this.isNewline = this.value === "\n";
        this.isInlineWhitespace = true;
        for (const c of this.value) {
            if (c !== ' ' && c !== '\t') {
                this.isInlineWhitespace = false;
                break;
            }
        }
    }
    get valueType() {
        return ValueType.String;
    }
    get isTruthy() {
        return this.value.length > 0;
    }
    get isNonWhitespace() {
        return !this.isNewline && !this.isInlineWhitespace;
    }
}
//# sourceMappingURL=StringValue.js.map
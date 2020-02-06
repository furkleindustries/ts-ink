import { Expression, } from './Expression/Expression';
import { FloatValue, } from '../../../Runtime/Value/FloatValue';
import { IntValue, } from '../../../Runtime/Value/IntValue';
export class NumberType extends Expression {
    constructor(value) {
        super();
        this.GenerateIntoContainer = (container) => {
            if (this.value % 1 === 0) {
                container.AddContent(new IntValue(this.value));
            }
            else {
                container.AddContent(new FloatValue(this.value));
            }
        };
        this.ToString = () => (String(this.value));
        if (typeof value === 'number' && !Number.isNaN(value)) {
            this.value = value;
        }
        else {
            throw new Error('Unexpected object type in NumberType.');
        }
    }
}
//# sourceMappingURL=NumberType.js.map
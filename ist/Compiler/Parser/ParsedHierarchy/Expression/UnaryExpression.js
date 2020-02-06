import { Expression, } from './Expression';
import { NativeFunctionCall, } from '../../../../Runtime/NativeFunctionCall';
export class UnaryExpression extends Expression {
    constructor(inner, op) {
        super();
        this.op = op;
        this.GenerateIntoContainer = (container) => {
            this.innerExpression.GenerateIntoContainer(container);
            container.AddContent(NativeFunctionCall.CallWithName(this.nativeNameForOp));
        };
        this.ToString = () => (this.nativeNameForOp + this.innerExpression);
        this.innerExpression = this.AddContent(inner);
    }
    get nativeNameForOp() {
        // Replace "-" with "_" to make it unique (compared to subtraction)
        if (this.op === '-') {
            return '_';
        }
        else if (this.op === 'not') {
            return '!';
        }
        return this.op;
    }
}
// Attempt to flatten inner expression immediately
// e.g. convert (-(5)) into (-5)
UnaryExpression.WithInner = (inner, op) => {
    const innerNumber = Number(inner);
    if (!Number.isNaN(innerNumber)) {
        if (op === '-') {
            return -Number(innerNumber);
        }
        else if (op === '!' || op === 'not') {
            return innerNumber === 0 ? 1 : 0;
        }
        throw new Error('Unexpected operation or number type');
    }
    // Normal fallback
    const unary = new UnaryExpression(inner, op);
    return unary;
};
//# sourceMappingURL=UnaryExpression.js.map
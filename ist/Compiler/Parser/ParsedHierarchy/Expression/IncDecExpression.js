import { ContentList, } from '../ContentList';
import { Expression, } from './Expression';
import { FlowBase, } from '../Flow/FlowBase';
import { NativeFunctionCall, } from '../../../../Runtime/NativeFunctionCall';
import { IntValue, } from '../../../../Runtime/Value/IntValue';
import { RuntimeVariableAssignment, } from '../../../../Runtime/Variable/VariableAssignment';
import { VariableReference, } from '../../../../Runtime/Variable/VariableReference';
import { Weave, } from '../Weave';
export class IncDecExpression extends Expression {
    constructor(varName, isIncOrExpression, isInc) {
        super();
        this.varName = varName;
        this.GenerateIntoContainer = (container) => {
            // x = x + y
            // ^^^ ^ ^ ^
            //  4  1 3 2
            // Reverse polish notation: (x 1 +) (assign to x)
            // 1.
            container.AddContent(new VariableReference(this.varName));
            // 2.
            // - Expression used in the form ~ x += y
            // - Simple version: ~ x++
            if (this.expression) {
                this.expression.GenerateIntoContainer(container);
            }
            else {
                container.AddContent(new IntValue(1));
            }
            // 3.
            container.AddContent(NativeFunctionCall.CallWithName(this.isInc ? '+' : '-'));
            // 4.
            this._runtimeAssignment = new RuntimeVariableAssignment(this.varName, false);
            container.AddContent(this._runtimeAssignment);
        };
        this.ResolveReferences = (context) => {
            super.ResolveReferences(context);
            const varResolveResult = context.ResolveVariableWithName(this.varName, this);
            if (!varResolveResult.found) {
                this.Error(`variable for ${this.incrementDecrementWord} could not be found: '${this.varName}' after searching: ${this.descriptionOfScope}`);
            }
            this._runtimeAssignment.isGlobal = varResolveResult.isGlobal;
            if (!(parent instanceof Weave) &&
                !(parent instanceof FlowBase) &&
                !(parent instanceof ContentList)) {
                this.Error(`Can't use ${this.incrementDecrementWord} as sub-expression`);
            }
        };
        this.ToString = () => {
            if (this.expression) {
                return `${this.varName}${this.isInc ? ' += ' : ' -= '}${this.expression.ToString()}`;
            }
            return this.varName + (this.isInc ? "++" : "--");
        };
        if (isIncOrExpression instanceof Expression) {
            this.expression = isIncOrExpression;
            this.AddContent(this.expression);
            this.isInc = Boolean(isInc);
        }
        else {
            this.isInc = isIncOrExpression;
        }
    }
    get incrementDecrementWord() {
        if (this.isInc) {
            return 'increment';
        }
        return 'decrement';
    }
}
//# sourceMappingURL=IncDecExpression.js.map
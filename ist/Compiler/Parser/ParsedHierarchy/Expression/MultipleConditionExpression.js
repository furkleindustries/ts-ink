import { Expression, } from './Expression';
import { NativeFunctionCall, } from '../../../../Runtime/NativeFunctionCall';
export class MultipleConditionExpression extends Expression {
    constructor(conditionExpressions) {
        super();
        this.GenerateIntoContainer = (container) => {
            //    A && B && C && D
            // => (((A B &&) C &&) D &&) etc
            let isFirst = true;
            for (const conditionExpr of this.subExpressions) {
                conditionExpr.GenerateIntoContainer(container);
                if (!isFirst) {
                    container.AddContent(NativeFunctionCall.CallWithName('&&'));
                }
                isFirst = false;
            }
        };
        this.AddContent(conditionExpressions);
    }
    get subExpressions() {
        return this.content;
    }
}
//# sourceMappingURL=MultipleConditionExpression.js.map
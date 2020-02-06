import { RuntimeContainer, } from '../../../../Runtime/Container';
import { RuntimeControlCommand, } from '../../../../Runtime/ControlCommand';
import { Object, } from '../Object';
export class Expression extends Object {
    constructor() {
        super(...arguments);
        this.GenerateRuntimeObject = () => {
            const container = new RuntimeContainer();
            // Tell Runtime to start evaluating the following content as an expression
            container.AddContent(RuntimeControlCommand.EvalStart());
            this.GenerateIntoContainer(container);
            // Tell Runtime to output the result of the expression evaluation to the output stream
            if (this.outputWhenComplete) {
                container.AddContent(RuntimeControlCommand.EvalOutput());
            }
            // Tell Runtime to stop evaluating the content as an expression
            container.AddContent(RuntimeControlCommand.EvalEnd());
            return container;
        };
        // When generating the value of a constant expression,
        // we can't just keep generating the same constant expression into
        // different places where the constant value is referenced, since then
        // the same runtime objects would be used in multiple places, which
        // is impossible since each runtime object should have one parent.
        // Instead, we generate a prototype of the runtime object(s), then
        // copy them each time they're used.
        this.GenerateConstantIntoContainer = (container) => {
            if (this._prototypeRuntimeConstantExpression === null) {
                this._prototypeRuntimeConstantExpression = new RuntimeContainer();
                this.GenerateIntoContainer(this._prototypeRuntimeConstantExpression);
            }
            for (const runtimeObj of this._prototypeRuntimeConstantExpression.content) {
                container.AddContent(runtimeObj.Copy());
            }
        };
        this.ToString = () => 'No string value in JavaScript.';
    }
}
//# sourceMappingURL=Expression.js.map
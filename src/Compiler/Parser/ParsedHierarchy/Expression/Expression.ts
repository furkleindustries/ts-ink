import {
  RuntimeContainer,
} from '../../../../Runtime/Container';
import {
  RuntimeControlCommand,
} from '../../../../Runtime/ControlCommand';
import {
  Object,
} from '../Object';
import {
  RuntimeObject,
} from '../../../../Runtime/Object';

export abstract class Expression extends Object {
  public abstract GenerateIntoContainer: (container: RuntimeContainer) => void;

  private _prototypeRuntimeConstantExpression: RuntimeContainer;
  public outputWhenComplete: boolean;

  public readonly GenerateRuntimeObject = (): RuntimeObject => {
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
  public readonly GenerateConstantIntoContainer = (
    container: RuntimeContainer,
  ): void => {
    if (this. _prototypeRuntimeConstantExpression === null ) {
      this._prototypeRuntimeConstantExpression = new RuntimeContainer();
      this.GenerateIntoContainer(this._prototypeRuntimeConstantExpression);
    }

    for (const runtimeObj of this._prototypeRuntimeConstantExpression.content) {
      container.AddContent(runtimeObj.Copy());
    }
  }


  public readonly ToString = () => 'No string value in JavaScript.';
}

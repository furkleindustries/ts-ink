import {
  Expression,
} from './Expression/Expression';
import {
  Object,
} from './Object';
import {
  RuntimeContainer,
} from '../../../Runtime/Container';
import {
  RuntimeControlCommand,
} from '../../../Runtime/ControlCommand';
import {
  RuntimeObject,
} from '../../../Runtime/Object';
import {
  Void,
} from '../../../Runtime/Void';

export class ReturnType extends Object {
  public returnedExpression: Expression | null = null;

  constructor(returnedExpression: Expression | null = null) {
    super();
            
    if (returnedExpression) {
      this.returnedExpression = this.AddContent(
        returnedExpression,
      ) as Expression;
    }
  }

  public readonly GenerateRuntimeObject = (): RuntimeObject => {
    const container = new RuntimeContainer();

    if (this.returnedExpression) {
      // Evaluate expression
      container.AddContent(this.returnedExpression.runtimeObject);
    } else {
      // Return Runtime.Void when there's no expression to evaluate
      // (This evaluation will just add the Void object to the evaluation stack)
      container.AddContent(RuntimeControlCommand.EvalStart());
      container.AddContent(new Void());
      container.AddContent(RuntimeControlCommand.EvalEnd());
    }

    // Then pop the call stack
    // (the evaluated expression will leave the return value on the evaluation stack)
    container.AddContent(RuntimeControlCommand.PopFunction());

    return container;
  };
}


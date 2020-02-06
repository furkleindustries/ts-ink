import {
  RuntimeObject,
} from '../Object';
import {
  Pointer,
} from '../Pointer';
import {
  PushPopType,
} from '../PushPopType';

export class CallStackElement {
  public temporaryVariables: Record<string, RuntimeObject> = {};

  // When this callstack element is actually a function evaluation called from the game,
  // we need to keep track of the size of the evaluation stack when it was called
  // so that we know whether there was any return value.
  public evaluationStackHeightWhenPushed: number;

  // When functions are called, we trim whitespace from the start and end of what
  // they generate, so we make sure know where the function's start and end are.
  public functionStartInOuputStream: number;

  constructor(
    public readonly type: PushPopType,
    public currentPointer: Pointer,
    public inExpressionEvaluation = false,
  )
  {}

  public readonly Copy = (): CallStackElement => {
    const copy = new CallStackElement(
      this.type,
      this.currentPointer,
      this.inExpressionEvaluation,
    );

    copy.temporaryVariables = { ...this.temporaryVariables };
    copy.evaluationStackHeightWhenPushed = this.evaluationStackHeightWhenPushed;
    copy.functionStartInOuputStream = this.functionStartInOuputStream;

    return copy;
  };
}

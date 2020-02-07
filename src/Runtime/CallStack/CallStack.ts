import {
  CallStackElement,
} from './Element';
import {
  CallStackThread,
} from './Thread';
import {
  Pointer,
} from '../Pointer';
import {
  RuntimeStory,
} from '../Story/Story';
import { PushPopType } from '../PushPopType';
import { RuntimeObject } from '../Object';
import { StoryError } from '../Story/StoryError';
import { ListValue } from '../Value/ListValue';

export class CallStack {
  private _threads: CallStackThread[] = [];
  get threads(): CallStackThread[] {
    return this._threads;
  }

  private _threadCounter: number = 0;
  get threadCounter(): number {
    return this._threadCounter;
  }

  private _startOfRoot: Pointer;
  get startOfRoot(): Pointer {
    return this._startOfRoot;
  }

  get callStack(): CallStackElement[] {
    return [ ...this.currentThread.callstack ];
  }

  get elements(): CallStackElement[] {
    return [ ...this.callStack ];
  }

  get depth(): number {
    return this.elements.length;
  }

  get currentElement(): CallStackElement { 
    const thread = this.threads[this.threads.length - 1];
    const cs = thread.callstack;

    return cs[cs.length - 1];
  }

  get currentElementIndex(): number {
    return this.callStack.length - 1;
  }

  get currentThread(): CallStackThread {
    return this.threads[this.threads.length - 1];
  }

  set currentThread(value) {
    if (this.threads.length !== 1) {
      throw new Error(
        'Shouldn\'t be directly setting the current thread when we have a stack of them.',
      );
    }

    this.threads.splice(0, this.threads.length);
    this.threads.push(value);
  }

  get canPop(): boolean {
    return this.callStack.length > 1;
  }

  constructor(from: RuntimeStory | CallStack) {
    if (from instanceof RuntimeStory) {
      this._startOfRoot = Pointer.StartOf(from.rootContentContainer);
      this.Reset();
    } else {
      this._threads = [];
      for (const otherThread of from.threads) {
        this.threads.push(otherThread.Copy());
      }

      this._threadCounter = from.threadCounter;
      this._startOfRoot = from.startOfRoot;
    }
  }

  public readonly Reset = (): void => {
    this._threads = [];
    this.threads.push(new CallStackThread());
    const elem = new CallStackElement(PushPopType.Tunnel, this.startOfRoot);
    this.threads[0].callstack.push(elem);
  };

  // Unfortunately it's not possible to implement jsonToken since
  // the setter needs to take a Story as a context in order to
  // look up objects from paths for currentContainer within elements.
  public readonly SetJsonToken = (
    jObject: Record<string, any>,
    storyContext: RuntimeStory,
  ): void => {
    this.threads.splice(0, this.threads.length);
    const jThreads = jObject.threads as any[];
    for (const jThreadTok of jThreads) {
      var jThreadObj: Record<string, any> = jThreadTok;
      const thread = new CallStackThread(jThreadObj, storyContext);
      this.threads.push(thread);
    }

    this._threadCounter = Number(jObject.threadCounter);
    this._startOfRoot = Pointer.StartOf(storyContext.rootContentContainer);
  };

  public readonly GetSerializedRepresentation = () => ({
    threads: this.threads.map(({ GetSerializedRepresentation }) => (
      GetSerializedRepresentation()
    )),

    threadCounter: this.threadCounter,
  });

  public readonly WriteJson = (spaces?: number): string => (
    JSON.stringify(
      this.GetSerializedRepresentation(),
      null,
      spaces ? spaces : undefined,
    )
  );

  public readonly PushThread = (): void => {
    const newThread = this.currentThread.Copy();
    this._threadCounter += 1;
    newThread.threadIndex = this.threadCounter;
    this.threads.push(newThread);
  };

  public readonly ForkThread = (): CallStackThread => {
    const forkedThread = this.currentThread.Copy();
    this._threadCounter += 1;
    forkedThread.threadIndex = this.threadCounter;

    return forkedThread;
  };

  public readonly PopThread = () => {
    if (this.canPopThread) {
      this.threads.splice(this.threads.indexOf(this.currentThread), 1);
    } else {
      throw new Error('Can\'t pop thread.');
    }
  };

  get canPopThread(): boolean {
    return this.threads.length > 1 && !this.elementIsEvaluateFromGame;
  }

  get elementIsEvaluateFromGame(): boolean {
    return this.currentElement.type === PushPopType.FunctionEvaluationFromGame;
  }

  public readonly Push = (
    type: PushPopType,
    externalEvaluationStackHeight = 0,
    outputStreamLengthWithPushed = 0,
  ): void => {
    // When pushing to callstack, maintain the current content path, but jump out of expressions by default
    const element = new CallStackElement(
      type,
      this.currentElement.currentPointer,
      false,
    );

    element.evaluationStackHeightWhenPushed = externalEvaluationStackHeight;
    element.functionStartInOuputStream = outputStreamLengthWithPushed;

    this.callStack.push(element);
  };

  public readonly CanPop = (type: PushPopType | null = null) => {
    if (!this.canPop) {
      return false;
    } else if (!type) {
      return true;
    }

    return this.currentElement.type === type;
  };
      
  public readonly Pop = (type: PushPopType | null = null) => {
    if (this.CanPop(type)) {
      this.callStack.splice(this.callStack.length - 1, 1);
      return;
    } else {
      throw new Error('Mismatched push/pop in Callstack.');
    }
  };

  // Get variable value, dereferencing a variable pointer if necessary
  public readonly GetTemporaryVariableWithName = (
    name: string,
    contextIndex = -1,
  ): RuntimeObject | null => {
    if (contextIndex === -1) {
      contextIndex = this.currentElementIndex + 1;
    }

    const contextElement = this.callStack[contextIndex - 1];
    const varValue = contextElement.temporaryVariables[name];

    if (varValue) {
      return varValue;
    }

    return null;
  };

  public readonly SetTemporaryVariable = (
    name: string,
    value: RuntimeObject,
    declareNew: boolean,
    contextIdx = -1,
  ) => {
    let contextIndex = contextIdx;
    if (contextIndex === -1) {
      contextIndex = this.currentElementIndex + 1;
    }

    const contextElement = this.callStack[contextIndex - 1];

    if (!declareNew && !(name in contextElement.temporaryVariables)) {
      throw new StoryError(`Could not find temporary variable to set: ${name}`);
    }

    const oldValue: RuntimeObject = contextElement.temporaryVariables[name];
    if (oldValue) {
      ListValue.RetainListOriginsForAssignment(oldValue, value);
    }

    contextElement.temporaryVariables [name] = value;
  };

  // Find the most appropriate context for this variable.
  // Are we referencing a temporary or global variable?
  // Note that the compiler will have warned us about possible conflicts,
  // so anything that happens here should be safe!
  public readonly ContextForVariableNamed = (name: string) => {
    // Current temporary context?
    // (Shouldn't attempt to access contexts higher in the callstack.)
    if (name in this.currentElement.temporaryVariables) {
      return this.currentElementIndex + 1;
    } 

    // Global
    return 0;
  };
      
  public readonly ThreadWithIndex = (index: number): CallStackThread | null => (
    this.threads.find((t) => t.threadIndex === index) || null
  );

  get callStackTrace(): string {
    let sb = '';

    for (let t = 0; t < this.threads.length; t += 1) {
      const thread = this.threads[t];
      const isCurrent = t === this.threads.length - 1;

      sb += `=== THREAD ${t + 1}/${this.threads.length} ${isCurrent ? '(current) ': ''}===\n`;

      for (let ii = 0; ii < thread.callstack.length; ii += 1) {
        if( thread.callstack[ii].type == PushPopType.Function ) {
          sb += '  [FUNCTION] ';
        } else {
          sb += '  [TUNNEL] ';
        }

        const pointer = thread.callstack[ii].currentPointer;
        if (!pointer.isNull) {
          sb += '<SOMEWHERE IN ';
          if (pointer.container && pointer.container.path) {
            sb += pointer.container.path.ToString();
          } else {
            sb += 'UNKNOWN, NO PATH'
          }
          sb += '>';
        }
      }
    }

    return sb;
  };
}

import {
  RuntimeChoice,
} from '../Choice/Choice';
import {
  ChoicePoint,
} from '../Choice/ChoicePoint';
import {
  CommandType,
} from '../CommandType';
import {
  RuntimeContainer,
} from '../Container';
import {
  RuntimeControlCommand,
} from '../ControlCommand';
import {
  DebugMetadata,
} from '../../DebugMetadata';
import {
  RuntimeDivert,
} from '../Divert/Divert';
import {
  DivertTargetValue,
} from '../Value/DivertTargetValue';
import {
  ExternalFunction,
} from './ExternalFunction';
import {
  RuntimeInkList,
} from '../List/InkList';
import {
  IntValue,
} from '../Value/IntValue';
import {
  JsonSerialization,
} from '../JsonSerialization'
import {
  RuntimeListDefinition,
} from '../List/ListDefinition';
import {
  ListDefinitionsOrigin,
} from '../ListDefinitionsOrigin';
import {
  ListValue,
} from '../Value/ListValue';
import {
  NativeFunctionCall,
} from '../NativeFunctionCall';
import {
  RuntimeObject,
} from '../Object';
import {
  OutputStateChange,
} from './OutputStateChange';
import {
  RuntimePath,
} from '../Path';
import {
  Pointer,
} from '../Pointer';
import {
  Profiler,
} from '../../Profiler';
import {
  PushPopType,
} from '../PushPopType';
import {
  Random,
} from '../../Random';
import {
  SearchResult,
} from '../SearchResult';
import {
  Stopwatch,
} from '../../Stopwatch'
import {
  StoryError,
} from './StoryError';
import {
  StoryState,
} from './StoryState';
import {
  StringValue,
} from '../Value/StringValue';
import {
  RuntimeTag,
} from '../Tag';
import {
  VariableObserver,
} from '../Variable/VariableObserver';
import {
  VariablesState,
} from '../Variable/VariablesState';
import {
  Value,
} from '../Value/Value';
import {
  RuntimeVariableAssignment,
} from '../Variable/VariableAssignment';
import {
  VariablePointerValue,
} from '../Value/VariablePointerValue';
import {
  RuntimeVariableReference,
} from '../Variable/VariableReference';
import {
  Void,
} from '../Void';

/// <summary>
/// A RuntimeStory is the core class that represents a complete Ink narrative, and
/// manages the runtime evaluation and state of it.
/// </summary>
export class RuntimeStory extends RuntimeObject {
  private _mainContentContainer: RuntimeContainer;
  get mainContentContainer(): RuntimeContainer {
    if (this.temporaryEvaluationContainer) {
      return this.temporaryEvaluationContainer;
    }

    return this._mainContentContainer;
  }

  private _listDefinitions: ListDefinitionsOrigin;
  get listDefinitions(): ListDefinitionsOrigin {
    return this._listDefinitions;
  }

  private _externals: Map<string, ExternalFunction>;
  get externals(): Map<string, ExternalFunction> {
    return this._externals;
  }

  private _variableObservers: Map<string, VariableObserver[]>;
  get variableObservers(): Map<string, VariableObserver[]> {
    return this._variableObservers;
  }

  private _hasValidatedExternals: boolean;
  get hasValidatedExternals(): boolean {
    return this._hasValidatedExternals;
  }

  private _temporaryEvaluationContainer: RuntimeContainer;
  get temporaryEvaluationContainer(): RuntimeContainer {
    return this._temporaryEvaluationContainer;
  }

  get currentDebugMetadata(): DebugMetadata {
    let dm: DebugMetadata;

    // Try to get from the current path first
    let pointer = this.state.currentPointer;
    if (!pointer.isNull) {
      dm = pointer.Resolve().debugMetadata;
      if (dm) {
        return dm;
      }
    }

    // Move up callstack if possible
    for (let ii = this.state.callStack.elements.length - 1; ii >= 0; --ii) {
      pointer = this.state.callStack.elements[ii].currentPointer;
      if (!pointer.isNull && pointer.Resolve()) {
        dm = pointer.Resolve().debugMetadata;
        if (dm) {
          return dm;
        }
      }
    }

    // Current/previous path may not be valid if we've just had an error,
    // or if we've simply run out of content.
    // As a last resort, try to grab something from the output stream
    for (let ii = this.state.outputStream.length - 1; ii >= 0; --ii) {
      const outputObj = this.state.outputStream[ii];
      dm = outputObj.debugMetadata;
      if (dm) {
        return dm;
      }
    }

    return null;
  };

  get currentLineNumber(): number {
    const dm = this.currentDebugMetadata;
    if (dm) {
      return dm.startLineNumber;
    }

    return 0;
  }

  private _state: StoryState;
  /// <summary>
  /// The entire current state of the story including (but not limited to):
  /// 
  ///  * Global variables
  ///  * Temporary variables
  ///  * Read/visit and turn counts
  ///  * The callstack and evaluation stacks
  ///  * The current threads
  /// 
  /// </summary>
  get state(): StoryState {
    return this._state;
  }

  private _asyncContinueActive: boolean;
  get asyncContinueActive(): boolean {
    return this._asyncContinueActive;
  }

  private _stateSnapshotAtLastNewline: StoryState = null;
  get stateSnapshotAtLastNewline(): StoryState {
    return this._stateSnapshotAtLastNewline;
  }

  private _recursiveContinueCount = 0;
  get recursiveContinueCount(): number {
    return this._recursiveContinueCount;
  }

  private _asyncSaving: boolean;
  get asyncSaving(): boolean {
    return this._asyncSaving;
  }

  private _profiler: Profiler;
  get profiler(): Profiler {
    return this._profiler;
  }

  /// <summary>
  /// The current version of the ink story file format.
  /// </summary>
  public get inkVersionCurrent(): number {
    return 19;
  }

  // Version numbers are for engine itself and story file, rather
  // than the story state save format
  //  -- old engine, new format: always fail
  //  -- new engine, old format: possibly cope, based on this number
  // When incrementing the version number above, the question you
  // should ask yourself is:
  //  -- Will the engine be able to load an old story file from 
  //     before I made these changes to the engine?
  //     If possible, you should support it, though it's not as
  //     critical as loading old save games, since it's an
  //     in-development problem only.

  /// <summary>
  /// The minimum legacy version of ink that can be loaded by the current version of the code.
  /// </summary>
  get inkVersionMinimumCompatible(): number {
    return 18;
  }

  /// <summary>
  /// The list of Choice objects available at the current point in
  /// the Story. This list will be populated as the Story is stepped
  /// through with the Continue() method. Once canContinue becomes
  /// false, this list will be populated, and is usually
  /// (but not always) on the final Continue() step.
  /// </summary>
  get currentChoices(): RuntimeChoice[] {
    // Don't include invisible choices for external usage.
    const choices: RuntimeChoice[] = [];
    for (const choice of this.state.currentChoices) {
      if (!choice.isInvisibleDefault) {
        choice.index = choices.length;
        choices.push(choice);
      }
    }

    return choices;
  }
          
  /// <summary>
  /// The latest line of text to be generated from a Continue() call.
  /// </summary>
  get currentText(): string {
    this.IfAsyncWeCant('call currentText since it\'s a work in progress');
    return this.state.currentText;
  }

  /// <summary>
  /// Gets a list of tags as defined with '#' in source that were seen
  /// during the latest Continue() call.
  /// </summary>
  get currentTags(): string[] {
    this.IfAsyncWeCant('call currentTags since it\'s a work in progress');
    return this.state.currentTags;
  }

  /// <summary>
  /// Any errors generated during evaluation of the Story.
  /// </summary>
  get currentErrors(): string[] {
    return this.state.currentErrors;
  }

  /// <summary>
  /// Any warnings generated during evaluation of the Story.
  /// </summary>
  public currentWarnings(): string[] {
    return this.state.currentWarnings;
  }

  /// <summary>
  /// Whether the currentErrors list contains any errors.
  /// </summary>
  get hasError(): boolean {
    return this.state.hasError;
  }

  /// <summary>
  /// Whether the currentWarnings list contains any warnings.
  /// </summary>
  get hasWarning(): boolean {
    return this.state.hasWarning;
  }

  /// <summary>
  /// The VariablesState object contains all the global variables in the story.
  /// However, note that there's more to the state of a Story than just the
  /// global variables. This is a convenience accessor to the full state object.
  /// </summary>
  get variablesState(): VariablesState {
    return this.state.variablesState;
  }

  /// <summary>
  /// Callback for when ContinueInternal is complete
  /// </summary>
  public onDidContinue: () => void;
  /// <summary>
  /// Callback for when a choice is about to be executed
  /// </summary>
  public onMakeChoice: (choice: RuntimeChoice) => void;
  /// <summary>
  /// Callback for when a function is about to be evaluated
  /// </summary>
  public onEvaluateFunction: (argOne: string, argtwo: any[]) => void;
  /// <summary>
  /// Callback for when a function has been evaluated
  /// This is necessary because evaluating a function can cause continuing
  /// </summary>
  public onCompleteEvaluateFunction: (
    argOne: string,
    argTwo: any[],
    argThree: string,
    argFour?: any,
  ) => void;

  /// <summary>
  /// Callback for when a path string is chosen
  /// </summary>
  public onChoosePathString: (argOne: string, argtwo: object[]) => void;

  /// <summary>
  /// Start recording ink profiling information during calls to Continue on Story.
  /// Return a Profiler instance that you can request a report from when you're finished.
  /// </summary>
  public readonly StartProfiling = (): Profiler => {
    this.IfAsyncWeCant('start profiling');
    this._profiler = new Profiler();
    return this.profiler;
  };

  /// <summary>
  /// Stop recording ink profiling information during calls to Continue on Story.
  /// To generate a report from the profiler, call 
  /// </summary>
  public readonly EndProfiling = (): void => {
    this._profiler = null;
  };
      
  constructor({
    contentContainer,
    lists = null,
    jsonString,
  }: {
    readonly contentContainer?: RuntimeContainer,
    readonly lists?: RuntimeListDefinition[],
    readonly jsonString?: string,
  } = {}) {
    super();

    if (jsonString) {
      /// Construct a Story object using a JSON string compiled through inklecate.

      let rootObject: Record<string, any> = JSON.parse(jsonString);

      let versionNumber: number = rootObject.inkVersion;
      if (!versionNumber) {
        throw new Error(
        'ink version number not found. Are you sure it\'s a valid .ink.json file?',
        );
      } else if (versionNumber > this.inkVersionCurrent) {
        throw new Error(
          'Version of ink used to build story was newer than the current version of the engine',
        );
      } else if (versionNumber < this.inkVersionMinimumCompatible) {
        throw new Error(
          'Version of ink used to build story is too old to be loaded by this version of the engine',
        );
      } else if (versionNumber !== this.inkVersionCurrent) {
        console.warn(
          'WARNING: Version of ink used to build story doesn\'t match current version of engine. Non-critical, but recommend synchronising.',
        );
      }

      const rootToken = rootObject.root;
      if (!rootToken) {
        throw new Error(
          'Root node for ink not found. Are you sure it\'s a valid .ink.json file?',
        );
      }

      const listDefsObj: object = rootObject.listDefs;
      if (listDefsObj) {
        this._listDefinitions = JsonSerialization.JTokenToListDefinitions(listDefsObj);
      }

      this._mainContentContainer = JsonSerialization.JTokenToRuntimeObject(
        rootToken,
      ) as RuntimeContainer;

      this.ResetState();
    } else if (contentContainer || lists) {
      // Warning: When creating a Story using this constructor, you need to
      // call ResetState on it before use. Intended for compiler use only.
      // For normal use, use the constructor that takes a json string.
      if (contentContainer) {
        this._mainContentContainer = contentContainer;
      }

      if (lists) {
        this._listDefinitions = new ListDefinitionsOrigin(lists);
      }
    }

    throw new Error('No necessary options provided to Story.');
  }

  /// <summary>
  /// The Story itself in JSON representation.
  /// </summary>
  public readonly ToJson = (): string => {
    const serialized = this.GetSerializedRepresentation(this);
    return JSON.stringify(serialized);
  };

  public readonly GetSerializedRepresentation = (
    story: RuntimeStory,
  ) => ({
    inkVersion: story.inkVersionCurrent,

    // Main container content
    root: JsonSerialization.WriteRuntimeContainer(story.mainContentContainer),

    // List definitions
    listDefs: story.listDefinitions ?
      story.listDefinitions.lists.reduce((
        obj,
        {
          name,
          items,
        },
      ) => Object.assign(obj, { [name]: items })) :
      null,
  });

  /// <summary>
  /// Reset the Story back to its initial state as it was when it was
  /// first constructed.
  /// </summary>
  public readonly ResetState = () => {
    // TODO: Could make this possible
    this.IfAsyncWeCant('ResetState');

    this._state = new StoryState(this);
    this.state.variablesState.variableChangedEvent = this.VariableStateDidChangeEvent;

    this.ResetGlobals();
  };

  /// <summary>
  /// Reset the runtime error and warning list within the state.
  /// </summary>
  public readonly ResetErrors = (): void => {
    this.state.ResetErrors();
  };

  /// <summary>
  /// Unwinds the callstack. Useful to reset the Story's evaluation
  /// without actually changing any meaningful state, for example if
  /// you want to exit a section of story prematurely and tell it to
  /// go elsewhere with a call to ChoosePathString(...).
  /// Doing so without calling ResetCallstack() could cause unexpected
  /// issues if, for example, the Story was in a tunnel already.
  /// </summary>
  public readonly ResetCallstack = (): void => {
    this.IfAsyncWeCant('ResetCallstack');
    this.state.ForceEnd();
  };

  public readonly ResetGlobals = (): void => {
    if ('global decl' in this.mainContentContainer.namedContent) {
      const originalPointer = this.state.currentPointer;

      this.ChoosePath(
        new RuntimePath({ componentsString: 'global decl' }),
        false,
      );

      // Continue, but without validating external bindings,
      // since we may be doing this reset at initialisation time.
      this.ContinueInternal();

      this.state.currentPointer = originalPointer;
    }

    this.state.variablesState.SnapshotDefaultGlobals();
  };

  /// <summary>
  /// Continue the story for one line of content, if possible.
  /// If you're not sure if there's more content available, for example if you
  /// want to check whether you're at a choice point or at the end of the story,
  /// you should call <c>canContinue</c> before calling this function.
  /// </summary>
  /// <returns>The line of text content.</returns>
  public readonly Continue = (): string => {
    this.ContinueAsync(0);
    return this.currentText;
  };


  /// <summary>
  /// Check whether more content is available if you were to call <c>Continue()</c> - i.e.
  /// are we mid story rather than at a choice point or at the end.
  /// </summary>
  /// <value><c>true</c> if it's possible to call <c>Continue()</c>.</value>
  get canContinue(): boolean {
    return this.state.canContinue;
  }

  /// <summary>
  /// If ContinueAsync was called (with milliseconds limit > 0) then this property
  /// will return false if the ink evaluation isn't yet finished, and you need to call 
  /// it again in order for the Continue to fully complete.
  /// </summary>
  get asyncContinueComplete(): boolean {
    return !this.asyncContinueActive;
  }

  /// <summary>
  /// An "asnychronous" version of Continue that only partially evaluates the ink,
  /// with a budget of a certain time limit. It will exit ink evaluation early if
  /// the evaluation isn't complete within the time limit, with the
  /// asyncContinueComplete property being false.
  /// This is useful if ink evaluation takes a long time, and you want to distribute
  /// it over multiple game frames for smoother animation.
  /// If you pass a limit of zero, then it will fully evaluate the ink in the same
  /// way as calling Continue (and in fact, this exactly what Continue does internally).
  /// </summary>
  public readonly ContinueAsync = (millisecsLimitAsync: number): void => {
    if (!this.hasValidatedExternals) {
      this.ValidateExternalBindings();
    }

    this.ContinueInternal(millisecsLimitAsync);
  };

  public readonly ContinueInternal = (millisecsLimitAsync = 0): void => {
    if (this.profiler) {
      this.profiler.PreContinue();
    }

    let isAsyncTimeLimited = millisecsLimitAsync > 0;

    this._recursiveContinueCount += 1;

    // Doing either:
    //  - full run through non-async (so not active and don't want to be)
    //  - Starting async run-through
    if (!this.asyncContinueActive) {
      this._asyncContinueActive = isAsyncTimeLimited;

      if (!this.canContinue) {
        throw new Error(
          'Can\'t continue - should check canContinue before calling Continue',
        );
      }

      this.state.didSafeExit = false;
      this.state.ResetOutput();

      // It's possible for ink to call game to call ink to call game etc
      // In this case, we only want to batch observe variable changes
      // for the outermost call.
      if (this.recursiveContinueCount === 1) {
        this.state.variablesState.batchObservingVariableChanges = true;
      }
    };

    // Start timing
    const durationStopwatch = new Stopwatch();
    durationStopwatch.Start();

    let outputStreamEndsInNewline: boolean = false;
    do {
      try {
        outputStreamEndsInNewline = this.ContinueSingleStep();
      } catch (e) {
        this.AddError(e.Message, e.useEndLineNumber);
        break;
      }

      if (outputStreamEndsInNewline) { 
        break;
      } else if (this.asyncContinueActive &&
        durationStopwatch.ElapsedMilliseconds > millisecsLimitAsync)
      {
        // Run out of async time?
        break;
      }
    } while(this.canContinue);

    durationStopwatch.Stop();

    // 4 outcomes:
    //  - got newline (so finished this line of text)
    //  - can't continue (e.g. choices or ending)
    //  - ran out of time during evaluation
    //  - error
    //
    // Successfully finished evaluation in time (or in error)
    if (outputStreamEndsInNewline || !this.canContinue) {
      // Need to rewind, due to evaluating further than we should?
      if (this.stateSnapshotAtLastNewline) {
        this.RestoreStateSnapshot();
      }

      // Finished a section of content / reached a choice point?
      if (!this.canContinue) {
        if (this.state.callStack.canPopThread) {
          this.AddError(
            'Thread available to pop, threads should always be flat by the end of evaluation?',
          );
        }

        if (!this.state.currentChoices.length &&
          !this.state.didSafeExit &&
          !this.temporaryEvaluationContainer)
        {
          if (this.state.callStack.CanPop(PushPopType.Tunnel)) {
            this.AddError(
              'unexpectedly reached end of content. Do you need a \'->->\' to return from a tunnel?',
            );
          } else if (this.state.callStack.CanPop(PushPopType.Function)) {
            this.AddError(
              'unexpectedly reached end of content. Do you need a \'~ return\'?',
            );
          } else if (!this.state.callStack.canPop) {
            this.AddError(
              'ran out of content. Do you need a \'-> DONE\' or \'-> END\'?',
            );
          } else {
            this.AddError(
              'unexpectedly reached end of content for unknown reason. Please debug compiler!',
            );
          }
        }
      }

      this.state.didSafeExit = false;

      if (this.recursiveContinueCount === 1) {
        this.state.variablesState.batchObservingVariableChanges = false;
      }

      this._asyncContinueActive = false;
      if (this.onDidContinue) {
        this.onDidContinue();
      }
    }

    this._recursiveContinueCount -= 1;

    if (this.profiler) {
      this.profiler.PostContinue();
    }
  };

  public readonly ContinueSingleStep = (): boolean => {
    if (this.profiler) {
      this.profiler.PreStep();
    }

    // Run main step function (walks through content)
    this.Step();

    if (this.profiler) {
      this.profiler.PostStep();
    }

    // Run out of content and we have a default invisible choice that we can follow?
    if (!this.canContinue && !this.state.callStack.elementIsEvaluateFromGame) {
      this.TryFollowDefaultInvisibleChoice();
    }

    if (this.profiler) {
      this.profiler.PreSnapshot();
    }

    // Don't save/rewind during string evaluation, which is e.g. used for choices
    if (!this.state.inStringEvaluation) {
      // We previously found a newline, but were we just double checking that
      // it wouldn't immediately be removed by glue?
      if (this.stateSnapshotAtLastNewline) {
        // Has proper text or a tag been added? Then we know that the newline
        // that was previously added is definitely the end of the line.
        const change = this.CalculateNewlineOutputStateChange(
          this.stateSnapshotAtLastNewline.currentText,
          this.state.currentText, 
          this.stateSnapshotAtLastNewline.currentTags.length,
          this.currentTags.length,
        );

        // The last time we saw a newline, it was definitely the end of the line, so we
        // want to rewind to that point.
        if (change === OutputStateChange.ExtendedBeyondNewline) {
          this.RestoreStateSnapshot();

          // Hit a newline for sure, we're done
          return true;
        } 

        // Newline that previously existed is no longer valid - e.g.
        // glue was encounted that caused it to be removed.
        else if (change == OutputStateChange.NewlineRemoved) {
          this.DiscardSnapshot();
        }
      }
    }

    // Current content ends in a newline - approaching end of our evaluation
    if (this.state.outputStreamEndsInNewline) {
      // If we can continue evaluation for a bit:
      // Create a snapshot in case we need to rewind.
      // We're going to continue stepping in case we see glue or some
      // non-text content such as choices.
      if (this.canContinue) {
        // Don't bother to record the state beyond the current newline.
        // e.g.:
        // Hello world\n            // record state at the end of here
        // ~ complexCalculation()   // don't actually need this unless it generates text
        if (this.stateSnapshotAtLastNewline === null) {
          this.StateSnapshot();
        } else {
          // Can't continue, so we're about to exit - make sure we
          // don't have an old state hanging around.
          this.DiscardSnapshot();
        }
      }
    }

    if (this.profiler) {
      this.profiler.PostSnapshot();
    }

    // outputStreamEndsInNewline = false
    return false;
  };

  public readonly CalculateNewlineOutputStateChange = (
    prevText: string,
    currText: string,
    prevTagCount: number,
    currTagCount: number,
  ): OutputStateChange => {
    // Simple case: nothing's changed, and we still have a newline
    // at the end of the current content
    const newlineStillExists = currText.length >= prevText.length &&
      currText[prevText.length - 1] === '\n';

    if (prevTagCount === currTagCount &&
      prevText.length === currText.length &&
      newlineStillExists)
    {
      return OutputStateChange.NoChange;
    } else if (!newlineStillExists) {
      // Old newline has been removed, it wasn't the end of the line after all
      return OutputStateChange.NewlineRemoved;
    } else if (currTagCount > prevTagCount) {
      // Tag added - definitely the start of a new line
      return OutputStateChange.ExtendedBeyondNewline;
    }

    // There must be new content - check whether it's just whitespace
    for (let ii = prevText.length; ii < currText.length; ii += 1) {
      const c = currText[ii];
      if (c !== ' ' && c !== '\t') {
        return OutputStateChange.ExtendedBeyondNewline;
      }
    }

    // There's new text but it's just spaces and tabs, so there's still the potential
    // for glue to kill the newline.
    return OutputStateChange.NoChange;
  };


  /// <summary>
  /// Continue the story until the next choice point or until it runs out of content.
  /// This is as opposed to the Continue() method which only evaluates one line of
  /// output at a time.
  /// </summary>
  /// <returns>The resulting text evaluated by the ink engine, concatenated together.</returns>
  public readonly ContinueMaximally = (): string => {
    this.IfAsyncWeCant('ContinueMaximally');

    let sb = '';
    while (this.canContinue) {
      sb += this.Continue();
    }

    return sb;
  };

  public readonly ContentAtPath = (path: RuntimePath): SearchResult => (
    this.mainContentContainer.ContentAtPath(path)
  );

  public readonly KnotContainerWithName = (name: string): RuntimeContainer => {
    const namedContent = this.mainContentContainer.namedContent;
    const namedContainer: RuntimeContainer = namedContent[name] as RuntimeContainer;
    if (namedContainer) {
      return namedContainer as RuntimeContainer;
    }

    return null;
  };

  public readonly PointerAtPath = (path: RuntimePath): Pointer => {
    if (path.length === 0) {
      return Pointer.Null;
    }

    const point = new Pointer();

    let pathLengthToUse = path.length;

    let result: SearchResult;
    if (path.lastComponent.isIndex) {
      pathLengthToUse = path.length - 1;
      result = this.mainContentContainer.ContentAtPath(path, 0, pathLengthToUse);
      point.container = result.container;
      point.index = path.lastComponent.index;
    } else {
      result = this.mainContentContainer.ContentAtPath(path);
      point.container = result.container;
      point.index = -1;
    }

    if (result.obj === null ||
      result.obj === this.mainContentContainer &&
      pathLengthToUse > 0)
    {
      this.Error(
        `Failed to find content at path '${path}', and no approximation of it was possible.`,
      );
    } else if (result.approximate) {
      this.Warning(
        `Failed to find content at path '${path}', so it was approximated to: '${result.obj.path}'.`,
      );
    }

    return point;
  };

  // Maximum snapshot stack:
  //  - stateSnapshotDuringSave -- not retained, but returned to game code
  //  - _stateSnapshotAtLastNewline (has older patch)
  //  - _state (current, being patched)

  public readonly StateSnapshot = (): void => {
    this._stateSnapshotAtLastNewline = this.state;
    this._state = this.state.CopyAndStartPatching();
  };

  public readonly RestoreStateSnapshot = (): void => {
    // Patched state had temporarily hijacked our
    // VariablesState and set its own callstack on it,
    // so we need to restore that.
    // If we're in the middle of saving, we may also
    // need to give the VariablesState the old patch.
    this.stateSnapshotAtLastNewline.RestoreAfterPatch();

    this._state = this.stateSnapshotAtLastNewline;
    this._stateSnapshotAtLastNewline = null;

    // If save completed while the above snapshot was
    // active, we need to apply any changes made since
    // the save was started but before the snapshot was made.
    if (!this.asyncSaving) {
      this.state.ApplyAnyPatch();
    }
  };

  public readonly DiscardSnapshot = (): void => {
    // Normally we want to integrate the patch
    // into the main global/counts dictionaries.
    // However, if we're in the middle of async
    // saving, we simply stay in a "patching" state,
    // albeit with the newer cloned patch.
    if (!this.asyncSaving) {
      this.state.ApplyAnyPatch();
    }

    // No longer need the snapshot.
    this._stateSnapshotAtLastNewline = null;
  };

  /// <summary>
  /// Advanced usage!
  /// If you have a large story, and saving state to JSON takes too long for your
  /// framerate, you can temporarily freeze a copy of the state for saving on 
  /// a separate thread. Internally, the engine maintains a "diff patch".
  /// When you've finished saving your state, call BackgroundSaveComplete()
  /// and that diff patch will be applied, allowing the story to continue
  /// in its usual mode.
  /// </summary>
  /// <returns>The state for background thread save.</returns>
  public readonly CopyStateForBackgroundThreadSave = (): StoryState => {
    this.IfAsyncWeCant('start saving on a background thread');
    if (this.asyncSaving) {
      throw new Error(
        'Story is already in background saving mode, can\'t call CopyStateForBackgroundThreadSave again!',
      );
    }

    const stateToSave = this.state;
    this._state = this.state.CopyAndStartPatching();
    this._asyncSaving = true;

    return stateToSave;
  };

  /// <summary>
  /// See CopyStateForBackgroundThreadSave. This method releases the
  /// "frozen" save state, applying its patch that it was using internally.
  /// </summary>
  public readonly BackgroundSaveComplete = (): void => {
    // CopyStateForBackgroundThreadSave must be called outside
    // of any async ink evaluation, since otherwise you'd be saving
    // during an intermediate state.
    // However, it's possible to *complete* the save in the middle of
    // a glue-lookahead when there's a state stored in _stateSnapshotAtLastNewline.
    // This state will have its own patch that is newer than the save patch.
    // We hold off on the final apply until the glue-lookahead is finished.
    // In that case, the apply is always done, it's just that it may
    // apply the looked-ahead changes OR it may simply apply the changes
    // made during the save process to the old _stateSnapshotAtLastNewline state.
    if (this.stateSnapshotAtLastNewline === null) {
      this.state.ApplyAnyPatch();
    }

    this._asyncSaving = false;
  };

  public readonly Step = (): void => {
    let shouldAddToStream = true;

    // Get current content
    let pointer = this.state.currentPointer;
    if (pointer.isNull) {
      return;
    }

    // Step directly to the first element of content in a container (if necessary)
    let containerToEnter = pointer.Resolve() as RuntimeContainer;
    while (containerToEnter) {
      // Mark container as being entered
      this.VisitContainer(containerToEnter, true);

      // No content? the most we can do is step past it
      if (containerToEnter.content.length === 0) {
        break;
      }

      pointer = Pointer.StartOf(containerToEnter);
      containerToEnter = pointer.Resolve() as RuntimeContainer;
    }

    this.state.currentPointer = pointer;

    if (this.profiler) {
      this.profiler.Step(this.state.callStack);
    }

    // Is the current content object:
    //  - Normal content
    //  - Or a logic/flow statement - if so, do it
    // Stop flow if we hit a stack pop when we're unable to pop (e.g. return/done statement in knot
    // that was diverted to rather than called as a function)
    let currentContentObj = pointer.Resolve();
    const isLogicOrFlowControl: boolean = this.PerformLogicAndFlowControl(
      currentContentObj,
    );

    // Has flow been forced to end by flow control above?
    if (this.state.currentPointer.isNull) {
      return;
    }

    if (isLogicOrFlowControl) {
      shouldAddToStream = false;
    }

    // Choice with condition?
    const choicePoint = currentContentObj as ChoicePoint;
    if (choicePoint) {
      const choice = this.ProcessChoice(choicePoint);
      if (choice) {
        this.state.currentChoices.push(choice);
      }

      currentContentObj = null;
      shouldAddToStream = false;
    }

    // If the container has no content, then it will be
    // the "content" itself, but we skip over it.
    if (currentContentObj instanceof RuntimeContainer) {
      shouldAddToStream = false;
    }

    // Content to add to evaluation stack or the output stream
    if (shouldAddToStream) {
      // If we're pushing a variable pointer onto the evaluation stack, ensure that it's specific
      // to our current (possibly temporary) context index. And make a copy of the pointer
      // so that we're not editing the original runtime object.
      const varPointer = currentContentObj as VariablePointerValue;
      if (varPointer && varPointer.contextIndex === -1) {
        // Create new object so we're not overwriting the story's own data
        const contextIdx = this.state.callStack.ContextForVariableNamed(varPointer.variableName);
        currentContentObj = new VariablePointerValue(varPointer.variableName, contextIdx);
      }

      if (this.state.inExpressionEvaluation) {
        // Expression evaluation content
        this.state.PushEvaluationStack(currentContentObj);
      } else {
        // Output stream content (i.e. not expression evaluation)
        this.state.PushToOutputStream(currentContentObj);
      }
    }

    // Increment the content pointer, following diverts if necessary
    this.NextContent();

    // Starting a thread should be done after the increment to the content pointer,
    // so that when returning from the thread, it returns to the content after this instruction.
    const controlCmd = currentContentObj as RuntimeControlCommand;
    if (controlCmd && controlCmd.commandType === CommandType.StartThread) {
      this.state.callStack.PushThread();
    }
  };

  // Mark a container as having been visited
  public readonly VisitContainer = (
    container: RuntimeContainer,
    atStart: boolean,
  ): void => {
    if ( !container.countingAtStartOnly || atStart ) {
      if (container.visitsShouldBeCounted) {
        this.state.IncrementVisitCountForContainer(container);
      }

      if (container.turnIndexShouldBeCounted) {
        this.state.RecordTurnIndexVisitToContainer(container);
      }
    }
  };

  private _prevContainers: RuntimeContainer[] = [];
  get prevContainers(): RuntimeContainer[] {
    return this._prevContainers;
  }

  public readonly VisitChangedContainersDueToDivert = (): void => {
    const previousPointer = this.state.previousPointer;
    const pointer = this.state.currentPointer;

    // Unless we're pointing *directly* at a piece of content, we don't do
    // counting here. Otherwise, the main stepping function will do the counting.
    if (pointer.isNull || pointer.index === -1) {
      return;
    }

    // First, find the previously open set of containers
    this.prevContainers.splice(0, this.prevContainers.length);
    if (!previousPointer.isNull) {
      let prevAncestor: RuntimeContainer = previousPointer.Resolve() as RuntimeContainer ||
        previousPointer.container as RuntimeContainer;

      while (prevAncestor) {
        this.prevContainers.push(prevAncestor);
        prevAncestor = prevAncestor.parent as RuntimeContainer;
      }
    }

    // If the new object is a container itself, it will be visited automatically at the next actual
    // content step. However, we need to walk up the new ancestry to see if there are more new containers
    let currentChildOfContainer: RuntimeObject = pointer.Resolve();

    // Invalid pointer? May happen if attemptingto 
    if (currentChildOfContainer === null) {
      return;
    }

    let currentContainerAncestor: RuntimeContainer = currentChildOfContainer.parent as RuntimeContainer;

    let allChildrenEnteredAtStart = true;
    while (currentContainerAncestor &&
      (!Object.values(this.prevContainers).includes(currentContainerAncestor) ||
        currentContainerAncestor.countingAtStartOnly))
    {
      // Check whether this ancestor container is being entered at the start,
      // by checking whether the child object is the first.
      const enteringAtStart: boolean = currentContainerAncestor.content.length > 0 &&
        currentChildOfContainer === currentContainerAncestor.content[0] &&
        allChildrenEnteredAtStart;

      // Don't count it as entering at start if we're entering random somewhere within
      // a container B that happens to be nested at index 0 of container A. It only counts
      // if we're diverting directly to the first leaf node.
      if (!enteringAtStart) {
        allChildrenEnteredAtStart = false;
      }

      // Mark a visit to this container
      this.VisitContainer(currentContainerAncestor, enteringAtStart);

      currentChildOfContainer = currentContainerAncestor;
      currentContainerAncestor = currentContainerAncestor.parent as RuntimeContainer;
    }
  };
      
  public readonly ProcessChoice = (choicePoint: ChoicePoint): RuntimeChoice => {3
    let showChoice = true;

    // Don't create choice if choice point doesn't pass conditional
    if (choicePoint.hasCondition) {
      const conditionValue = this.state.PopEvaluationStack();
      if (!this.IsTruthy(conditionValue)) {
        showChoice = false;
      }
    }

    let startText = '';
    let choiceOnlyText = '';

    if (choicePoint.hasChoiceOnlyContent) {
      const choiceOnlyStrVal = this.state.PopEvaluationStack() as StringValue;
      choiceOnlyText = choiceOnlyStrVal.value;
    }

    if (choicePoint.hasStartContent) {
      const startStrVal = this.state.PopEvaluationStack() as StringValue;
      startText = startStrVal.value;
    }

    // Don't create choice if player has already read this content
    if (choicePoint.onceOnly) {
      const visitCount = this.state.VisitCountForContainer(choicePoint.choiceTarget);
      if (visitCount > 0) {
        showChoice = false;
      }
    }

    // We go through the full process of creating the choice above so
    // that we consume the content for it, since otherwise it'll
    // be shown on the output stream.
    if (!showChoice) {
      return null;
    }

    const choice = new RuntimeChoice();
    choice.targetPath = choicePoint.pathOnChoice;
    choice.sourcePath = choicePoint.path.ToString();
    choice.isInvisibleDefault = choicePoint.isInvisibleDefault;

    // We need to capture the state of the callstack at the point where
    // the choice was generated, since after the generation of this choice
    // we may go on to pop out from a tunnel (possible if the choice was
    // wrapped in a conditional), or we may pop out from a thread,
    // at which point that thread is discarded.
    // Fork clones the thread, gives it a new ID, but without affecting
    // the thread stack itself.
    choice.threadAtGeneration = this.state.callStack.ForkThread();

    // Set final text for the choice
    choice.text = `${startText}${choiceOnlyText}`.replace(new RegExp(/[ \t]/g), '');

    return choice;
  };

  // Does the expression result represented by this object evaluate to true?
  // e.g. is it a Number that's not equal to 1?
  public readonly IsTruthy = (obj: RuntimeObject): boolean => {
    let truthy = false;
    if (obj instanceof Value) {
      const val = obj as Value;
      if (val instanceof DivertTargetValue) {
        const divTarget = val as DivertTargetValue;
        this.Error(
          `Shouldn't use a divert target (to ${divTarget.targetPath}) as a conditional value. Did you intend a function call 'likeThis()' or a read count check 'likeThis'? (no arrows)`,
        );

        return false;
      }

      return val.isTruthy;
    }

    return truthy;
  };

  /// <summary>
  /// Checks whether contentObj is a control or flow object rather than a piece of content, 
  /// and performs the required command if necessary.
  /// </summary>
  /// <returns><c>true</c> if object was logic or flow control, <c>false</c> if it's normal content.</returns>
  /// <param name="contentObj">Content object.</param>
  public readonly PerformLogicAndFlowControl = (contentObj: RuntimeObject) => {
    if (contentObj === null ) {
      return false;
    }

    // Divert
    if (contentObj instanceof RuntimeDivert) {
      let currentDivert: RuntimeDivert = contentObj as RuntimeDivert;
      if (currentDivert.isConditional) {
        const conditionValue = this.state.PopEvaluationStack();

        // False conditional? Cancel divert
        if (!this.IsTruthy(conditionValue)) {
          return true;
        }
      }

      if (currentDivert.hasVariableTarget) {
        const varName = currentDivert.variableDivertName;
        const varContents = this.state.variablesState.GetVariableWithName(
          varName,
        );

        if (varContents === null) {
          this.Error(
            `Tried to divert using a target from a variable that could not be found (${varName})`,
          );
        } else if (!(varContents instanceof DivertTargetValue)) {
          const intContent = varContents as IntValue;
          let errorMessage = `Tried to divert to a target from a variable, but the variable (${varName}) didn't contain a divert target, it `;
          if (intContent && intContent.value === 0) {
            errorMessage += 'was empty/null (the value 0).';
          } else {
            errorMessage += `contained '${varContents}'.`;
          }

          this.Error(errorMessage);
        }

        const target = varContents as DivertTargetValue;
        this.state.divertedPointer = this.PointerAtPath(target.targetPath);
      } else if (currentDivert.isExternal) {
        this.CallExternalFunction(
          currentDivert.targetPathString,
          currentDivert.externalArgs,
        );

        return true;
      } else {
        this.state.divertedPointer = currentDivert.targetPointer;
      }

      if (currentDivert.pushesToStack) {
        this.state.callStack.Push(
          currentDivert.stackPushType, 
          this.state.outputStream.length,
        );
      }

      if (this.state.divertedPointer.isNull && !currentDivert.isExternal) {
        // Human readable name available - runtime divert is part of a hard-written divert that to missing content
        if (currentDivert && currentDivert.debugMetadata.sourceName !== null) {
          this.Error(`Divert target doesn't exist: ${currentDivert.debugMetadata.sourceName}`);
        } else {
          this.Error(`Divert resolution failed: ${currentDivert}`);
        }
      }

      return true;
    } else if (contentObj instanceof RuntimeControlCommand) {
      // Start/end an expression evaluation? Or print out the result?
      const evalCommand = contentObj as RuntimeControlCommand;

      switch (evalCommand.commandType) {
        case CommandType.EvalStart:
          if (this.state.inExpressionEvaluation) {
            throw new Error('Already in expression evaluation?');
          }

          this.state.inExpressionEvaluation = true;

          break;

        case CommandType.EvalEnd:
          if (!this.state.inExpressionEvaluation) {
            throw new Error('Not in expression evaluation mode');
          }

          this.state.inExpressionEvaluation = false;

          break;

        case CommandType.EvalOutput:
          // If the expression turned out to be empty, there may not be anything on the stack
          if (this.state.evaluationStack.length > 0) {
            const output = this.state.PopEvaluationStack();

            // Functions may evaluate to Void, in which case we skip output
            if (!(output instanceof Void)) {
              // TODO: Should we really always blanket convert to string?
              // It would be okay to have numbers in the output stream the
              // only problem is when exporting text for viewing, it skips over numbers etc.
              const val = 'ToString' in output ? (output as any).ToString() : String(output);
              const text = new StringValue(val);
              this.state.PushToOutputStream(text);
            }
          }

          break;

        case CommandType.NoOp:
            break;

        case CommandType.Duplicate:
          this.state.PushEvaluationStack(this.state.PeekEvaluationStack());

          break;

        case CommandType.PopEvaluatedValue:
            this.state.PopEvaluationStack();

            break;

        case CommandType.PopFunction:
        case CommandType.PopTunnel:
          const popType = evalCommand.commandType === CommandType.PopFunction ?
              PushPopType.Function :
              PushPopType.Tunnel;

          // Tunnel onwards is allowed to specify an optional override
          // divert to go to immediately after returning: ->-> target
          let overrideTunnelReturnTarget: DivertTargetValue = null;
          if (popType === PushPopType.Tunnel) {
            var popped = this.state.PopEvaluationStack();
            const overrideTunnelReturnTarget = popped as DivertTargetValue;
            if (overrideTunnelReturnTarget === null) {
              if (!(popped instanceof Void)) {
                throw new Error(
                  'Expected void if ->-> doesn\'t override target.',
                );
              }
            }
          }

          if (this.state.TryExitFunctionEvaluationFromGame()) {
            break;
          } else if (this.state.callStack.currentElement.type !== popType ||
            !this.state.callStack.canPop)
          {
            const names: Record<PushPopType, string> = {} as Record<PushPopType, string>;
            names[PushPopType.Function] = 'function return statement (~ return)';
            names[PushPopType.Tunnel] = 'tunnel onwards statement (->->)';

            let expected: string = names[this.state.callStack.currentElement.type];
            if (!this.state.callStack.canPop) {
              expected = 'end of flow (-> END or choice)';
            }

            const errorMsg = `Found ${names[popType]}, when expected ${expected}`;

            this.Error(errorMsg);
          } else {
            this.state.PopCallstack();

            // Does tunnel onwards override by diverting to a new ->-> target?
            if (overrideTunnelReturnTarget) {
              this.state.divertedPointer = this.PointerAtPath(
                overrideTunnelReturnTarget.targetPath,
              );
            }
          }

          break;

        case CommandType.BeginString:
          this.state.PushToOutputStream (evalCommand);

          if (!this.state.inExpressionEvaluation) {
            throw new Error(
              'Expected to be in an expression when evaluating a string',
            );
          }

          this.state.inExpressionEvaluation = false;

          break;

        case CommandType.EndString:
          // Since we're iterating backward through the content,
          // build a stack so that when we build the string,
          // it's in the right order
          const contentStackForString: RuntimeObject[] = [];

          let outputCountConsumed = 0;
          for (let ii = this.state.outputStream.length - 1; ii >= 0; --ii) {
            const obj = this.state.outputStream[ii];

            outputCountConsumed += 1;

            const command = obj as RuntimeControlCommand;
            if (command !== null &&
              command.commandType === CommandType.BeginString)
            {
              break;
            } else if (obj instanceof StringValue) {
              contentStackForString.push(obj);
            }
          }

          // Consume the content that was produced for this string
          this.state.PopFromOutputStream(outputCountConsumed);

          // Build string out of the content we collected
          let sb = '';
          for (const c of contentStackForString) {
            sb += ('ToString' in c) ? (c as any).ToString() : String(c);
          }

          // Return to expression evaluation (from content mode)
          this.state.inExpressionEvaluation = true;
          this.state.PushEvaluationStack(new StringValue(sb));

          break;

        case CommandType.ChoiceCount:
          const choiceCount = this.state.currentChoices.length;
          this.state.PushEvaluationStack(new IntValue(choiceCount));

          break;

        case CommandType.Turns:
          this.state.PushEvaluationStack(
            new IntValue(this.state.currentTurnIndex + 1),
          );

          break;

        case CommandType.TurnsSince:
        case CommandType.ReadCount:
          var target = this.state.PopEvaluationStack();
          if (!(target instanceof DivertTargetValue)) {
            let extraNote: string = '';
            if (target instanceof IntValue) {
              extraNote = '. Did you accidentally pass a read count (\'knot_name\') instead of a target (\'-> knot_name\')?';
            }

            this.Error(
              `TURNS_SINCE expected a divert target (knot, stitch, label name), but saw ${target}${extraNote}`,
            );

            break;
          }
              
          const divertTarget = target as DivertTargetValue;
          const container = this.ContentAtPath(
            divertTarget.targetPath,
          ).correctObj as RuntimeContainer;

          let eitherCount: number;
          if (container) {
            if (evalCommand.commandType == CommandType.TurnsSince) {
              eitherCount = this.state.TurnsSinceForContainer(container);
            } else {
              eitherCount = this.state.VisitCountForContainer(container);
            }
          } else {
            if (evalCommand.commandType === CommandType.TurnsSince) {
              eitherCount = -1; // turn count, default to never/unknown
            } else {
              eitherCount = 0; // visit count, assume 0 to default to allowing entry
            }

            this.Warning(
              `Failed to find container for ${evalCommand.ToString()} lookup at ${divertTarget.targetPath.ToString()}`,
            );
          }

          this.state.PushEvaluationStack(new IntValue(eitherCount));

          break;

        case CommandType.Random: {
          const maxInt = this.state.PopEvaluationStack() as IntValue;
          const minInt = this.state.PopEvaluationStack() as IntValue;

          if (!minInt) {
            this.Error('Invalid value for minimum parameter of RANDOM(min, max)');
          }

          if (!maxInt) {
            this.Error('Invalid value for maximum parameter of RANDOM(min, max)');
          }

          // +1 because it's inclusive of min and max, for e.g. RANDOM(1,6) for a dice roll.
          let randomRange = maxInt.value - minInt.value + 1;
          if (randomRange <= 0) {
            this.Error(
              `RANDOM was called with minimum as ${minInt.value} and maximum as ${maxInt.value}. The maximum must be larger`,
            );
          }

          const resultSeed = this.state.storySeed + this.state.previousRandom;
          const nextRandom = Math.floor(Math.random() * resultSeed);
          const chosenValue = (nextRandom % randomRange) + minInt.value;
          this.state.PushEvaluationStack(new IntValue(chosenValue));

          // Next random number (rather than keeping the Random object around)
          this.state.previousRandom = nextRandom;

          break;
        }

        case CommandType.SeedRandom:
          const seed = this.state.PopEvaluationStack() as IntValue;
          if (!seed) {
            this.Error('Invalid value passed to SEED_RANDOM');
          }

          // Story seed affects both RANDOM and shuffle behaviour
          this.state.storySeed = seed.value;
          this.state.previousRandom = 0;

          // SEED_RANDOM returns nothing.
          this.state.PushEvaluationStack(new Void());

          break;

        case CommandType.VisitIndex:
          const count = this.state.VisitCountForContainer(
            this.state.currentPointer.container,
          ) - 1; // index not count

          this.state.PushEvaluationStack(new IntValue(count));

          break;

        case CommandType.SequenceShuffleIndex:
            const shuffleIndex = this.nextSequenceShuffleIndex;
            this.state.PushEvaluationStack(new IntValue(shuffleIndex));

            break;

        case CommandType.StartThread:
            // Handled in main step function
            break;

        case CommandType.Done:
          // We may exist in the context of the initial
          // act of creating the thread, or in the context of
          // evaluating the content.
          if (this.state.callStack.canPopThread) {
            this.state.callStack.PopThread();
          } else {
            // In normal flow - allow safe exit without warning
            this.state.didSafeExit = true;

            // Stop flow in current thread
            this.state.currentPointer = Pointer.Null;
          }

          break;
        
        // Force flow to end completely
        case CommandType.End:
          this.state.ForceEnd();
          break;

        case CommandType.ListFromInt:
          const intVal = this.state.PopEvaluationStack() as IntValue;
          const listNameVal = this.state.PopEvaluationStack() as StringValue;

          if (intVal === null) { 
            throw new StoryError(
              'Passed non-integer when creating a list element from a numerical value.',
            ); 
          }

          let generatedListValue: ListValue = null;

          const foundListDef = this.listDefinitions.GetListDefinition(listNameVal.value);
          if (foundListDef) {
            const foundItem = foundListDef.GetItemWithValue(intVal.value)
            if (foundItem) {
              generatedListValue = new ListValue({
                singleItem: [
                  foundItem,
                  intVal.value,
                ],
              });
            }
          } else {
            throw new StoryError(
              `Failed to find LIST called ${listNameVal.value}`,
            );
          }

          if (generatedListValue === null) {
            generatedListValue = new ListValue();
          }

          this.state.PushEvaluationStack(generatedListValue);

          break;

        case CommandType.ListRange: {
          const max = this.state.PopEvaluationStack() as IntValue;
          const min = this.state.PopEvaluationStack() as IntValue;
          const targetList = this.state.PopEvaluationStack() as ListValue;

          if (!targetList || !min || !max) {
            throw new StoryError(
              'Expected list, minimum and maximum for LIST_RANGE',
            );
          }

          const list = targetList.value.ListWithSubRange(min.valueObject, max.valueObject);
          this.state.PushEvaluationStack(new ListValue({ list }));

          break;
        }

        case CommandType.ListRandom: {
          const listVal = this.state.PopEvaluationStack() as ListValue;
          if (listVal === null) {
            throw new StoryError('Expected list for LIST_RANDOM');
          }

          const list = listVal.value;
          let newList: RuntimeInkList = null;

          if (list.Size() === 0) {
            // List was empty: return empty list
            newList = new RuntimeInkList();
          } else {
            // Non-empty source list
            // Generate a random index for the element to take
            const resultSeed = this.state.storySeed + this.state.previousRandom;
            const random = new Random(resultSeed);
            const nextRandom = random.Next();
            const listItemIndex = nextRandom % list.Size();

            // Iterate through to get the random element
            const randomItem = list.orderedItems[Number(listItemIndex)];

            // Origin list is simply the origin of the one element
            newList = new RuntimeInkList({
              originStory: this,
              singleOriginListName: randomItem[0].originName,
            });

            newList.Add(...randomItem);

            this.state.previousRandom = nextRandom;
          }

          this.state.PushEvaluationStack(new ListValue({ list: newList }));

          break;
        }

        default:
          this.Error(`unhandled ControlCommand: ${evalCommand}`);
          break;
      }

      return true;
    } else if (contentObj instanceof RuntimeVariableAssignment) {
      // Variable assignment
      const varAss = contentObj as RuntimeVariableAssignment;
      const assignedVal = this.state.PopEvaluationStack();
      this.state.variablesState.Assign(varAss, assignedVal);

      return true;
    } else if (contentObj instanceof RuntimeVariableReference) {
      // Variable reference
      const varRef = contentObj as RuntimeVariableReference;
      let foundValue: RuntimeObject = null;

      // Explicit read count value
      if (varRef.pathForCount != null) {
        const container = varRef.containerForCount;
        const count = this.state.VisitCountForContainer(container);
        foundValue = new IntValue(count);
      } else {
        // Normal variable reference
        foundValue = this.state.variablesState.GetVariableWithName(varRef.name);
        if (!foundValue) {
          this.Warning(
            `Variable not found: '${varRef.name}'. Using default value of 0 (false). This can happen with temporary variables if the declaration hasn't yet been hit. Globals are always given a default value on load if a value doesn't exist in the save state.`,
          );

          foundValue = new IntValue(0);
        }
      }

      this.state.PushEvaluationStack(foundValue);

      return true;
    } else if (contentObj instanceof NativeFunctionCall) {
      // Native function call
      const func = contentObj as NativeFunctionCall;
      const funcParams = this.state.PopEvaluationStack(func.numberOfParameters) as Value[];
      const result = func.Call(funcParams);
      this.state.PushEvaluationStack(result);

      return true;
    }

    // No control content, must be ordinary content
    return false;
  };

  /// <summary>
  /// Change the current position of the story to the given path. From here you can 
  /// call Continue() to evaluate the next line.
  /// 
  /// The path string is a dot-separated path as used internally by the engine.
  /// These examples should work:
  /// 
  ///    myKnot
  ///    myKnot.myStitch
  /// 
  /// Note however that this won't necessarily work:
  /// 
  ///    myKnot.myStitch.myLabelledChoice
  /// 
  /// ...because of the way that content is nested within a weave structure.
  /// 
  /// By default this will reset the callstack beforehand, which means that any
  /// tunnels, threads or functions you were in at the time of calling will be
  /// discarded. This is different from the behaviour of ChooseChoiceIndex, which
  /// will always keep the callstack, since the choices are known to come from the
  /// correct state, and known their source thread.
  /// 
  /// You have the option of passing false to the resetCallstack parameter if you
  /// don't want this behaviour, and will leave any active threads, tunnels or
  /// function calls intact.
  /// 
  /// This is potentially dangerous! If you're in the middle of a tunnel,
  /// it'll redirect only the inner-most tunnel, meaning that when you tunnel-return
  /// using '->->', it'll return to where you were before. This may be what you
  /// want though. However, if you're in the middle of a function, ChoosePathString
  /// will throw an exception.
  /// 
  /// </summary>
  /// <param name="path">A dot-separted path string, as specified above.</param>
  /// <param name="resetCallstack">Whether to reset the callstack first (see summary description).</param>
  /// <param name="arguments">Optional set of arguments to pass, if path is to a knot that takes them.</param>
  public readonly ChoosePathString = (
    path: string,
    resetCallstack = true,
    ...args: any[]
  ): void => {
    this.IfAsyncWeCant('call ChoosePathString right now');
    if (this.onChoosePathString) {
      this.onChoosePathString(path, args);
    }

    if (resetCallstack) {
      this.ResetCallstack();
    } else {
      // ChoosePathString is potentially dangerous since you can call it when the stack is
      // pretty much in any state. Let's catch one of the worst offenders.
      if (this.state.callStack.currentElement.type === PushPopType.Function) {
        let funcDetail: string = '';
        const container = this.state.callStack.currentElement.currentPointer.container;
        if (container !== null) {
          funcDetail = `(${container.path.ToString()})`;
        }

        throw new Error(
          `Story was running a function ${funcDetail} when you called ChoosePathString(${path}) - this is almost certainly not not what you want! Full stack trace:\n${this.state.callStack.callStackTrace}`,
        );
      }
    }

    this.state.PassArgumentsToEvaluationStack(args);
    this.ChoosePath(new RuntimePath({ componentsString: path }));
  };

  public readonly IfAsyncWeCant = (activityStr: string): void => {
    if (this.asyncContinueActive) {
      throw new Error(
        `Can't ${activityStr}. Story is in the middle of a ContinueAsync(). Make more ContinueAsync() calls or a single Continue() call beforehand.`,
      );
    }
  };
      
  public readonly ChoosePath = (
    p: RuntimePath,
    incrementingTurnIndex = true,
  ): void => {
    this.state.SetChosenPath(p, incrementingTurnIndex);

    // Take a note of newly visited containers for read counts etc
    this.VisitChangedContainersDueToDivert();
  };

  /// <summary>
  /// Chooses the Choice from the currentChoices list with the given
  /// index. Internally, this sets the current content path to that
  /// pointed to by the Choice, ready to continue story evaluation.
  /// </summary>
  public readonly ChooseChoiceIndex = (choiceIdx: number) => {
    const choices = this.currentChoices;
    if (!(choiceIdx >= 0 && choiceIdx < choices.length)) {
      throw new Error('choice out of range');
    }

    // Replace callstack with the one from the thread at the choosing point, 
    // so that we can jump into the right place in the flow.
    // This is important in case the flow was forked by a new thread, which
    // can create multiple leading edges for the story, each of
    // which has its own context.
    const choiceToChoose = choices[choiceIdx];
    if (this.onMakeChoice) {
      this.onMakeChoice(choiceToChoose);
    }

    this.state.callStack.currentThread = choiceToChoose.threadAtGeneration;

    this.ChoosePath(choiceToChoose.targetPath);
  };

  /// <summary>
  /// Checks if a function exists.
  /// </summary>
  /// <returns>True if the function exists, else false.</returns>
  /// <param name="functionName">The name of the function as declared in ink.</param>
  public readonly HasFunction = (functionName: string): boolean => {
    try {
      return this.KnotContainerWithName(functionName) !== null;
    } catch {
      return false;
    }
  };

  /// <summary>
  /// Evaluates a function defined in ink, and gathers the possibly multi-line text as generated by the function.
  /// This text output is any text written as normal content within the function, as opposed to the return value, as returned with `~ return`.
  /// </summary>
  /// <returns>The return value as returned from the ink function with `~ return myValue`, or null if nothing is returned.</returns>
  /// <param name="functionName">The name of the function as declared in ink.</param>
  /// <param name="textOutput">The text content produced by the function via normal ink, if any.</param>
  /// <param name="arguments">The arguments that the ink function takes, if any. Note that we don't (can't) do any validation on the number of arguments right now, so make sure you get it right!</param>
  public readonly EvaluateFunction = (
    functionName: string,
    ...args: any[]
  ): any => {
    if (this.onEvaluateFunction) {
      this.onEvaluateFunction(functionName, args);
    }

    this.IfAsyncWeCant('evaluate a function');

    if (!functionName ||
      typeof functionName !== 'string' ||
      functionName.trim())
    {
      throw new Error('Function is empty or white space.');
    }

    // Get the content that we need to run
    const funcContainer = this.KnotContainerWithName(functionName);
    if (funcContainer) {
      throw new Error(`Function doesn't exist: '${functionName}'`);
    }

    // Snapshot the output stream
    const outputStreamBefore: RuntimeObject[] = [ ...this.state.outputStream ];
    this.state.ResetOutput();

    // State will temporarily replace the callstack in order to evaluate
    this.state.StartFunctionEvaluationFromGame(funcContainer, args);

    // Evaluate the function, and collect the string output
    let stringOutput = '';
    while (this.canContinue) {
      stringOutput += this.Continue();
    }

    // Restore the output stream in case this was called
    // during main story evaluation.
    this.state.ResetOutput(outputStreamBefore);

    // Finish evaluation, and see whether anything was produced
    const result = this.state.CompleteFunctionEvaluationFromGame();
    if (this.onCompleteEvaluateFunction) {
      this.onCompleteEvaluateFunction(functionName, args, result);
    }

    return result;
  };

  // Evaluate a "hot compiled" piece of ink content, as used by the REPL-like
  // CommandLinePlayer.
  readonly EvaluateExpression = (exprContainer: RuntimeContainer): RuntimeObject => {
    const startCallStackHeight = this.state.callStack.elements.length;

    this.state.callStack.Push(PushPopType.Tunnel);

    this._temporaryEvaluationContainer = exprContainer;

    this.state.GoToStart();

    const evalStackHeight = this.state.evaluationStack.length;

    this.Continue();

    this._temporaryEvaluationContainer = null;

    // Should have fallen off the end of the Container, which should
    // have auto-popped, but just in case we didn't for some reason,
    // manually pop to restore the state (including currentPath).
    if (this.state.callStack.elements.length > startCallStackHeight) {
      this.state.PopCallstack();
    }

    const endStackHeight = this.state.evaluationStack.length;
    if (endStackHeight > evalStackHeight) {
      return this.state.PopEvaluationStack();
    }

    return null;
  };

  /// <summary>
  /// An ink file can provide a fallback functions for when when an EXTERNAL has been left
  /// unbound by the client, and the fallback function will be called instead. Useful when
  /// testing a story in playmode, when it's not possible to write a client-side C# external
  /// function, but you don't want it to fail to run.
  /// </summary>
  public allowExternalFunctionFallbacks: Function;

  public readonly CallExternalFunction = (
    funcName: string,
    numberOfArguments: number,
  ): void => {
    const func: ExternalFunction = this.externals[funcName];
    let fallbackFunctionContainer: RuntimeContainer = null;

    // Try to use fallback function?
    if (!func) {
      if (this.allowExternalFunctionFallbacks) {
        fallbackFunctionContainer = this.KnotContainerWithName(funcName);
        if (!fallbackFunctionContainer) {
          throw new Error(
            `Trying to call EXTERNAL function '${funcName}' which has not been bound, and fallback ink function could not be found.`,
          );
        }

        // Divert direct into fallback function and we're done
        this.state.callStack.Push(
          PushPopType.Function,
          this.state.outputStream.length,
        );

        this.state.divertedPointer = Pointer.StartOf(fallbackFunctionContainer);

        return;
      }
      
      throw new Error(
        `Trying to call EXTERNAL function '${funcName}' which has not been bound (and ink fallbacks disabled).`,
      );
    }

    // Pop arguments
    const args = [];
    for (let ii = 0; ii < numberOfArguments; ++ii) {
      const poppedObj = this.state.PopEvaluationStack() as Value;
      const valueObj = poppedObj.valueObject;
      args.unshift(valueObj);
    }

    // Run the function!
    const funcResult = func(args);

    // Convert return value (if any) to the a type that the ink engine can use
    let returnObj: RuntimeObject = null;
    if (funcResult) {
      returnObj = Value.Create(funcResult);
      if (!returnObj !== null) {
        throw new Error(
          `Could not create ink value from returned object of type ${funcResult.GetType()}`,
        );
      }
    } else {
      returnObj = new Void();
    }

    this.state.PushEvaluationStack(returnObj);
  };

  /// <summary>
  /// Most general form of function binding that returns an object
  /// and takes an array of object parameters.
  /// The only way to bind a function with more than 3 arguments.
  /// </summary>
  /// <param name="funcName">EXTERNAL ink function name to bind to.</param>
  /// <param name="func">The C# function to bind.</param>
  public readonly BindExternalFunctionGeneral = (
    funcName: string,
    func: ExternalFunction,
  ): void => {
    this.IfAsyncWeCant('bind an external function');
    if (funcName in this.externals) {
      throw new Error(`Function '${funcName}' has already been bound.`);
    }

    this.externals[funcName] = func;
  };

  public readonly TryCoerce = <T extends 'float' | 'int' | 'boolean' | 'string'>(
    value: any,
    T: T,
  ): number | boolean | string => {
    if (value === null || value === undefined) {
      return null;
    }

    const sameType = (
      (typeof value === 'number' && T === 'float') ||
      (typeof value === 'number' && T === 'int') ||
      (typeof value === 'number' && T === 'boolean' &&
        (value === 0 || value === 1)) ||
      (typeof value === 'string' && T === 'string') ||
      (typeof value === 'boolean' && T === 'boolean')
    );

    if (sameType) {
      return value;
    } else if (typeof value === 'number' && T === 'int') {
      const intVal = value;
      return intVal;
    } else if (typeof value === 'number' && T === 'float') {
      const floatVal = Number(value);
      return floatVal;
    } else if (typeof value === 'number' && T === 'boolean') {
      let intVal = value;
      return intVal === 0 ? false : true;
    } else if (T === 'string') {
      return 'ToString' in value ? value.ToString() : String(value);
    }

    throw new Error(
      `Failed to cast ${value.GetType()} to ${typeof T}`,
    );
  };

  // Convenience overloads for standard functions and actions of various arities
  // Is there a better way of doing this?!

  /// <summary>
  /// Bind a C# function to an ink EXTERNAL function declaration.
  /// </summary>
  /// <param name="funcName">EXTERNAL ink function name to bind to.</param>
  /// <param name="func">The C# function to bind.</param>
  public readonly BindExternalFunction = (
    funcName: string,
    func: (...args: any[]) => any,
    ...args: any[]
  ) => {
    if (typeof func !== 'function') {
      throw new Error('Can\'t bind a non-function.');
    }

    this.BindExternalFunctionGeneral(funcName, () => func(...args));
  };

  /// <summary>
  /// Remove a binding for a named EXTERNAL ink function.
  /// </summary>
  public readonly UnbindExternalFunction = (funcName: string) => {
    this.IfAsyncWeCant('unbind an external  function');
    if (!('funcName' in this.externals)) {
      throw new Error(`Function '${funcName}' has not been bound.`);
    }

    delete this.externals[funcName];
  };

  private _validateWithObj = (
    obj: RuntimeObject,
    missingExternals: Set<string>,
  ): void => {
    const container = obj instanceof RuntimeContainer ? obj : null;
    if (container) {
      this.ValidateExternalBindings(container, missingExternals);
      return;
    }

    const divert = obj instanceof RuntimeDivert ? obj : null;
    if (divert && divert.isExternal) {
      const name = divert.targetPathString;

      if (!(name in this.externals)) {
        if (this.allowExternalFunctionFallbacks) {
          const fallbackFound = name in this.mainContentContainer.namedContent;
          if (!fallbackFound) {
            missingExternals.add(name);
          }
        } else {
          missingExternals.add(name);
        }
      }
    }
  };

  /// <summary>
  /// Check that all EXTERNAL ink functions have a valid bound C# function.
  /// Note that this is automatically called on the first call to Continue().
  /// </summary>
  public readonly ValidateExternalBindings = (
    c?: RuntimeContainer,
    missingExternals: Set<string> = new Set(),
  ) => {
    if (c && missingExternals) {
      for (const innerContent of c.content) {
        const container = innerContent as RuntimeContainer;
        if (!container || !container.hasValidName) {
          this._validateWithObj(
            innerContent as RuntimeObject,
            missingExternals,
          );
        }
      }

      for (const value of Object.values(c.namedContent)) {
        this._validateWithObj(value as any as RuntimeObject, missingExternals);
      }
    } else {
      this.ValidateExternalBindings(this.mainContentContainer, missingExternals);
      this._hasValidatedExternals = true;
  
      if (!missingExternals.size) {
        // No problem! Validation complete
        this._hasValidatedExternals = true;
      } else {
        // Error for all missing externals
        const message = `ERROR: Missing function binding for external${missingExternals.size > 1 ? 's' : ''}: '${Array.from(missingExternals).join('\', \'')}' ${this.allowExternalFunctionFallbacks ? ', and no fallback ink function found.' : ' (ink fallbacks disabled)'}`;

        this.Error(message);
      }
    }
  };

  /// <summary>
  /// When the named global variable changes it's value, the observer will be
  /// called to notify it of the change. Note that if the value changes multiple
  /// times within the ink, the observer will only be called once, at the end
  /// of the ink's evaluation. If, during the evaluation, it changes and then
  /// changes back again to its original value, it will still be called.
  /// Note that the observer will also be fired if the value of the variable
  /// is changed externally to the ink, by directly setting a value in
  /// story.variablesState.
  /// </summary>
  /// <param name="variableName">The name of the global variable to observe.</param>
  /// <param name="observer">A delegate function to call when the variable changes.</param>
  public readonly ObserveVariable = (
    variableName: string,
    observer: VariableObserver,
  ): void => {
    this.IfAsyncWeCant('observe a new variable');

    if (!this.variableObservers) {
      this._variableObservers = new Map();
    }

    if (!this.state.variablesState.GlobalVariableExistsWithName(variableName)) { 
      throw new StoryError(
        `Cannot observe variable '${variableName}' because it wasn't declared in the ink story.`,
      );
    }

    if (this.variableObservers.has(variableName)) {
      this.variableObservers[variableName].push(observer);
    } else {
      this.variableObservers[variableName] = [ observer ];
    }
  };

  /// <summary>
  /// Convenience function to allow multiple variables to be observed with the same
  /// observer delegate function. See the singular ObserveVariable for details.
  /// The observer will get one call for every variable that has changed.
  /// </summary>
  /// <param name="variableNames">The set of variables to observe.</param>
  /// <param name="observer">The delegate function to call when any of the named variables change.</param>
  public readonly ObserveVariables = (
    variableNames: string[],
    observer: VariableObserver,
  ) => {
    for (const varName of variableNames) {
      this.ObserveVariable(varName, observer);
    }
  };

  /// <summary>
  /// Removes the variable observer, to stop getting variable change notifications.
  /// If you pass a specific variable name, it will stop observing that particular one. If you
  /// pass null (or leave it blank, since it's optional), then the observer will be removed
  /// from all variables that it's subscribed to. If you pass in a specific variable name and
  /// null for the the observer, all observers for that variable will be removed. 
  /// </summary>
  /// <param name="observer">(Optional) The observer to stop observing.</param>
  /// <param name="specificVariableName">(Optional) Specific variable name to stop observing.</param>
  public readonly RemoveVariableObserver = (
    observer: VariableObserver = null,
    specificVariableName: string = null,
  ) => {
    this.IfAsyncWeCant('remove a variable observer');

    if (!this.variableObservers) {
      return;
    }

    // Remove observer for this specific variable
    if (specificVariableName) {
      if (this.variableObservers.has(specificVariableName)) {
        if (observer) {
          this.variableObservers.get(specificVariableName).splice(
            this.variableObservers.get(specificVariableName).indexOf(observer),
            1,
          );
          if (!this.variableObservers.get(specificVariableName)) {
            this.variableObservers.delete(specificVariableName);
          }
        } else {
          this.variableObservers.delete(specificVariableName);
        }
      }
    } else if (observer) {
      // Remove observer for all variables
      const keys = [ ...this.variableObservers.keys() ];
      for (const varName of keys) {
        this.variableObservers.get(varName).splice(
          this.variableObservers.get(varName).indexOf(observer),
          1,
        );

        if (!this.variableObservers.get(varName)) {
          this.variableObservers.delete(varName);
        }
      }
    }
  };

  public readonly VariableStateDidChangeEvent = (
    variableName: string,
    newValueObj: RuntimeObject,
  ) => {
    if (!this.variableObservers) {
      return;
    }

    const observers: VariableObserver[] = this.variableObservers.get(variableName);
    if (observers) {
      if (!(newValueObj instanceof Value)) {
        throw new Error(
          'Tried to get the value of a variable that isn\'t a standard type',
        );
      }

      const val = newValueObj as Value;
      for (const observer of observers) {
        observer(variableName, val.valueObject);
      }
    }
  };

  /// <summary>
  /// Get any global tags associated with the story. These are defined as
  /// hash tags defined at the very top of the story.
  /// </summary>
  get globalTags(): string[] {
    return this.TagsAtStartOfFlowContainerWithPathString('');
  }

  /// <summary>
  /// Gets any tags associated with a particular knot or knot.stitch.
  /// These are defined as hash tags defined at the very top of a 
  /// knot or stitch.
  /// </summary>
  /// <param name="path">The path of the knot or stitch, in the form "knot" or "knot.stitch".</param>
  public readonly TagsForContentAtPath = (path: string): string[] => (
    this.TagsAtStartOfFlowContainerWithPathString(path)
  );

  public readonly TagsAtStartOfFlowContainerWithPathString = (
    pathString: string,
  ): string[] => {
    const path = new RuntimePath({ componentsString: pathString });

    // Expected to be global story, knot or stitch
    let flowContainer = this.ContentAtPath(path).container;
    while(true) {
      const firstContent = flowContainer.content[0];
      if (firstContent instanceof RuntimeContainer) {
        flowContainer = firstContent as RuntimeContainer;
      } else {
        break;
      }
    }

    // Any initial tag objects count as the "main tags" associated with that story/knot/stitch
    const tags: string[] = [];
    for (const c of flowContainer.content) {
      const tag = c as RuntimeTag;
      if (tag) {
        tags.push(tag.text);
      } else {
        break;
      }
    }

    return tags;
  };

  /// <summary>
  /// Useful when debugging a (very short) story, to visualise the state of the
  /// story. Add this call as a watch and open the extended text. A left-arrow mark
  /// will denote the current point of the story.
  /// It's only recommended that this is used on very short debug stories, since
  /// it can end up generate a large quantity of text otherwise.
  /// </summary>
  public readonly BuildStringOfHierarchy = (): string => (
    this.mainContentContainer.BuildStringOfHierarchy(
      '',
      0,
      this.state.currentPointer.Resolve(),
    )
  );

  public readonly BuildStringOfContainer = (
    container: RuntimeContainer,
  ): string => (
    container.BuildStringOfHierarchy(
      '',
      0,
      this.state.currentPointer.Resolve(),
    )
  );

  public readonly NextContent = () => {
    // Setting previousContentObject is critical for VisitChangedContainersDueToDivert
    this.state.previousPointer = this.state.currentPointer;

    // Divert step?
    if (!this.state.divertedPointer.isNull) {
      this.state.currentPointer = this.state.divertedPointer;
      this.state.divertedPointer = Pointer.Null;

      // Internally uses state.previousContentObject and state.currentContentObject
      this.VisitChangedContainersDueToDivert();

      // Diverted location has valid content?
      if (!this.state.currentPointer.isNull) {
        return;
      }
    }

    // Otherwise, if diverted location doesn't have valid content,
    // drop down and attempt to increment.
    // This can happen if the diverted path is intentionally jumping
    // to the end of a container - e.g. a Conditional that's re-joining
    const successfulPointerIncrement = this.IncrementContentPointer();

    // Ran out of content? Try to auto-exit from a function,
    // or finish evaluating the content of a thread
    if (!successfulPointerIncrement) {
      let didPop: boolean = false;

      if (this.state.callStack.CanPop(PushPopType.Function)) {
        // Pop from the call stack
        this.state.PopCallstack(PushPopType.Function);

        // This pop was due to dropping off the end of a function that didn't return anything,
        // so in this case, we make sure that the evaluator has something to chomp on if it needs it
        if (this.state.inExpressionEvaluation) {
          this.state.PushEvaluationStack(new Void());
        }

        didPop = true;
      } else if (this.state.callStack.canPopThread) {
        this.state.callStack.PopThread();
        didPop = true;
      } else {
        this.state.TryExitFunctionEvaluationFromGame();
      }

      // Step past the point where we last called out
      if (didPop && !this.state.currentPointer.isNull) {
        this.NextContent();
      }
    }
  };

  public readonly IncrementContentPointer = (): boolean => {
    let successfulIncrement = true;

    let pointer = this.state.callStack.currentElement.currentPointer;
    pointer.index += 1;

    // Each time we step off the end, we fall out to the next container, all the
    // while we're in indexed rather than named content
    while (pointer.index >= pointer.container.content.length) {
      successfulIncrement = false;

      const nextAncestor = pointer.container.parent as RuntimeContainer;
      if (!nextAncestor) {
        break;
      }

      const indexInAncestor = nextAncestor.content.indexOf(pointer.container);
      if (indexInAncestor === -1) {
        break;
      }

      pointer = new Pointer(nextAncestor, indexInAncestor);

      // Increment to next content in outer container
      pointer.index += 1;

      successfulIncrement = true;
    }

    if (!successfulIncrement) {
      pointer = Pointer.Null;
    }

    this.state.callStack.currentElement.currentPointer = pointer;

    return successfulIncrement;
  };
  
  public readonly TryFollowDefaultInvisibleChoice = () => {
    const allChoices = this.state.currentChoices;

    // Is a default invisible choice the ONLY choice?
    const invisibleChoices = allChoices.filter((c) => c.isInvisibleDefault);
    if (!invisibleChoices.length || allChoices.length > invisibleChoices.length) {
      return false;
    }

    const choice = invisibleChoices[0];

    // Invisible choice may have been generated on a different thread,
    // in which case we need to restore it before we continue
    this.state.callStack.currentThread = choice.threadAtGeneration;

    // If there's a chance that this state will be rolled back to before
    // the invisible choice then make sure that the choice thread is
    // left intact, and it isn't re-entered in an old state.
    if (this.stateSnapshotAtLastNewline !== null) {
      this.state.callStack.currentThread = this.state.callStack.ForkThread();
    }

    this.ChoosePath(choice.targetPath, false);

    return true;
  };  

  // Note that this is O(n), since it re-evaluates the shuffle indices
  // from a consistent seed each time.
  // TODO: Is this the best algorithm it can be?
  get nextSequenceShuffleIndex(): number {
    var numElementsIntVal = this.state.PopEvaluationStack () as IntValue;
    if (numElementsIntVal === null) {
      this.Error('expected number of elements in sequence for shuffle index');
      return 0;
    }

    const seqContainer = this.state.currentPointer.container;
    let numElements = numElementsIntVal.value;
    const seqCountVal = this.state.PopEvaluationStack () as IntValue;
    const seqCount = seqCountVal.value;
    const loopIndex = seqCount / numElements;
    const iterationIndex = seqCount % numElements;

    // Generate the same shuffle based on:
    //  - The hash of this container, to make sure it's consistent
    //    each time the runtime returns to the sequence
    //  - How many times the runtime has looped around this full shuffle
    const seqPathStr: string = seqContainer.path.ToString();
    let sequenceHash = 0;
    for (const c of seqPathStr) {
      sequenceHash += c.charCodeAt(0);
    }

    const randomSeed = sequenceHash + loopIndex + this.state.storySeed;
    const random = new Random(randomSeed);

    const unpickedIndices: number[] = [];
    for (let ii = 0; ii < numElements; ii += 1) {
      unpickedIndices.push(ii);
    }

    for (let ii = 0; ii <= iterationIndex; ii += 1) {
      var chosen = random.Next() % unpickedIndices.length;
      var chosenIndex = unpickedIndices [chosen];
      unpickedIndices.splice(chosen, 1);

      if (ii === iterationIndex) {
        return chosenIndex;
      }
    }

    throw new Error('Should never reach here.');
  };

  // Throw an exception that gets caught and causes AddError to be called,
  // then exits the flow.
  public readonly Error = (
    message: string,
    useEndLineNumber = false,
  ): void => {
    const e = new StoryError(message);
    e.useEndLineNumber = useEndLineNumber;
    throw e;
  };

  public readonly Warning = (message: string): void => {
    this.AddError(message, true);
  };

  public readonly AddError = (
    msg: string,
    isWarning = false,
    useEndLineNumber = false,
  ) => {
    const dm = this.currentDebugMetadata;
    const errorTypeStr = isWarning ? 'WARNING' : 'ERROR';

    let message = msg;
    if (dm) {
      const lineNum = useEndLineNumber ? dm.endLineNumber : dm.startLineNumber;
      message = `RUNTIME ${errorTypeStr}: '${dm.fileName}' line ${lineNum}: ${message}`;
    } else if (!this.state.currentPointer.isNull) {
      message = `RUNTIME ${errorTypeStr}: (${this.state.currentPointer.path}): ${message}`;
    } else {
      message = "RUNTIME "+errorTypeStr+": " + message;
    }

    this.state.AddError(message, isWarning);

    // In a broken state don't need to know about any other errors.
    if (!isWarning) {
      this.state.ForceEnd();
    }
  };

  public readonly Assert = (
    condition: boolean,
    message: string = 'Story assert',
    ...formatParams: any[]
  ) => {
    if (!condition) {
      if (formatParams.length) {
        message += formatParams.map((param: any) => (
          'ToString' in param ? param.ToString(): String(param)
        )).join('');
      }

      throw new Error(`${message} ${this.currentDebugMetadata}`);
    }
  };
}

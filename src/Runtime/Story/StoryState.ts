import {
  CallStack,
} from '../CallStack/CallStack';
import {
  CallStackThread,
} from '../CallStack/Thread';
import {
  RuntimeChoice,
} from '../Choice/Choice';
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
  RuntimeGlue,
} from '../Glue';
import {
  RuntimeInkList,
} from '../List/InkList';
import {
  JsonSerialization,
} from '../JsonSerialization';
import {
  ListValue,
} from '../Value/ListValue';
import {
  mapFromDict,
} from '../../mapFromDict';
import {
  RuntimeObject,
} from '../Object';
import {
  RuntimePath,
} from '../Path';
import {
  Pointer,
} from '../Pointer';
import {
  PushPopType,
} from '../PushPopType';
import {
  Random,
} from '../../Random';
import {
  StatePatch,
} from './StatePatch';
import {
  RuntimeStory,
} from './Story';
import {
  StoryError,
} from './StoryError';
import {
  RuntimeTag,
} from '../Tag';
import {
  StringValue,
} from '../Value/StringValue';
import {
  Value,
} from '../Value/Value';
import {
  ValueType,
} from '../Value/ValueType';
import {
  VariablesState,
} from '../Variable/VariablesState';
import {
  Void,
} from '../Void';

/// <summary>
/// All story state information is included in the StoryState class,
/// including global variables, read counts, the pointer to the current
/// point in the story, the call stack (for tunnels, functions, etc),
/// and a few other smaller bits and pieces. You can save the current
/// state using the json serialisation functions ToJson and LoadJson.
/// </summary>
export class StoryState {
  /// <summary>
  /// The current version of the state save file JSON-based format.
  /// </summary>
  public readonly kInkSaveStateVersion = 8;
  public readonly kMinCompatibleLoadVersion = 8;

  public currentErrors: string[];
  public currentWarnings: string[];
  public variablesState: VariablesState;
  public callStack: CallStack;
  public evaluationStack: RuntimeObject[];
  public divertedPointer: Pointer;
  public currentTurnIndex: number;
  public storySeed: number;
  public previousRandom: number;
  public didSafeExit: boolean;
  public story: RuntimeStory;

  // REMEMBER! REMEMBER! REMEMBER!
  // When adding state, update the Copy method and serialisation
  // REMEMBER! REMEMBER! REMEMBER!
  private _visitCounts: Map<string, number> = new Map();
  get visitCounts(): Map<string, number> {
    return this._visitCounts;
  }

  private _turnIndices: Map<string, number> = new Map();
  get turnIndices(): Map<string, number> {
    return this._turnIndices;
  }

  private _outputStream: RuntimeObject[];
  get outputStream(): RuntimeObject[] {
    return this._outputStream;
  }

  private _outputStreamTextDirty: boolean = true;
  get outputStreamTextDirty(): boolean {
    return this._outputStreamTextDirty;
  }

  private _outputStreamTagsDirty: boolean = true;
  get outputStreamTagsDirty(): boolean {
    return this._outputStreamTagsDirty;
  }

  private _currentChoices: RuntimeChoice[];
  get currentChoices(): RuntimeChoice[] {
    // If we can continue generating text content rather than choices,
    // then we reflect the choice list as being empty, since choices
    // should always come at the end.
    if (this.canContinue) {
      return [];
    }

    return this._currentChoices;
  }

  private _patch: StatePatch;
  get patch(): StatePatch {
    return this._patch;
  }

  get callstackDepth(): number {
    return this.callStack.depth;
  }

  /// <summary>
  /// String representation of the location where the story currently is.
  /// </summary>
  get currentPathString(): string {
    const pointer = this.currentPointer;
    if (pointer.isNull) {
      return null;
    }

    return pointer.path.ToString();
  }

  get currentPointer(): Pointer {
    return this.callStack.currentElement.currentPointer;
  }

  set currentPointer(value: Pointer) {
    this.callStack.currentElement.currentPointer = value;
  }

  get previousPointer(): Pointer { 
    return this.callStack.currentThread.previousPointer;
  }

  set previousPointer(value: Pointer) {
    this.callStack.currentThread.previousPointer = value;
  }

  get canContinue(): boolean {
    return !this.currentPointer.isNull && !this.hasError;
  }

  get hasError(): boolean {
    return this.currentErrors && this.currentErrors.length > 0;
  }

  get hasWarning(): boolean {
    return this.currentWarnings && this.currentWarnings.length > 0;
  }

  private _currentText: string;
  get currentText(): string {
    if (this.outputStreamTextDirty) {
      let sb = '';
      for (const outputObj of this.outputStream) {
        const textContent = outputObj as StringValue;
        if (textContent) {
          sb += textContent.value;
        }
      }

      this._currentText = this.CleanOutputWhitespace(sb);

      this._outputStreamTextDirty = false;
    }

    return this._currentText;
  }

  private _currentTags: string[];
  get currentTags(): string[] {
    if (this.outputStreamTagsDirty) {
      this._currentTags = [];

      for (const outputObj of this.outputStream) {
        const tag = outputObj as RuntimeTag;
        if (tag) {
          this.currentTags.push(tag.text);
        }
      }

      this._outputStreamTagsDirty = false;
    }

    return this._currentTags;
  }


  get inExpressionEvaluation(): boolean {
    return this.callStack.currentElement.inExpressionEvaluation;
  }

  set inExpressionEvaluation(value: boolean) {
    this.callStack.currentElement.inExpressionEvaluation = value;
  }

  

  get outputStreamEndsInNewline(): boolean {
    if (this.outputStream.length > 0) {
      for (let ii = this.outputStream.length - 1; ii >= 0; ii--) {
        const obj = this.outputStream[ii];
        if (obj instanceof RuntimeControlCommand) {
          // e.g. BeginString
          break;
        }

        const text = this.outputStream[ii] as StringValue;
        if (text) {
          if (text.isNewline) {
            return true;
          } else if (text.isNonWhitespace) {
            break;
          }
        }
      }
    }

    return false;
  }

  get outputStreamContainsContent(): boolean {
    for (const content of this.outputStream) {
      if (content instanceof StringValue) {
        return true;
      }
    }

    return false;
  }

  get inStringEvaluation(): boolean {
    for (let ii = this.outputStream.length - 1; ii >= 0; ii--) {
      const cmd = this.outputStream[ii] as RuntimeControlCommand;
      if (cmd && cmd.commandType === CommandType.BeginString) {
        return true;
      }
    }

    return false;
  }

  /// <summary>
  /// Exports the current state to json format, in order to save the game.
  /// </summary>
  /// <returns>The save state in json format.</returns>
  public readonly ToJson = (spaces?: number): string => (
    JSON.stringify(this.GetSerializedRepresentation(), null, spaces || null)
  );

  /// <summary>
  /// Loads a previously saved state in JSON format.
  /// </summary>
  /// <param name="json">The JSON string to load.</param>
  public readonly LoadJson = (json: string): void => {
    const jObject = JSON.parse(json);
    this.LoadJsonObj(jObject);
  };

  /// <summary>
  /// Gets the visit/read count of a particular Container at the given path.
  /// For a knot or stitch, that path string will be in the form:
  /// 
  ///     knot
  ///     knot.stitch
  /// 
  /// </summary>
  /// <returns>The number of times the specific knot or stitch has
  /// been enountered by the ink engine.</returns>
  /// <param name="pathString">The dot-separated path string of
  /// the specific knot or stitch.</param>
  public readonly VisitCountAtPathString = (
    pathString: string,
  ): number => {
    let visitCountOut;

    if (this.patch) {
      const container = this.story.ContentAtPath(
        new RuntimePath({ componentsString: pathString }),
      ).container;

      if (!container) {
        throw new Error(`Content at path not found: ${pathString}`);
      }

      const visitCount = this.patch.TryGetVisitCount(container);
      if (visitCount !== null) {
        return visitCount;
      }
    }

    const visitCount = this.visitCounts.get(pathString);
    if (visitCount !== null && visitCount !== undefined) {
      return visitCountOut;
    }

    return 0;
  };

  public readonly VisitCountForContainer = (
    container: RuntimeContainer,
  ): number => {
    if (!container.visitsShouldBeCounted) {
      this.story.Error(
        `Read count for target (${container.name} - on ${container.debugMetadata}) unknown.`,
      );

      return 0;
    }

    if (this.patch && this.patch.TryGetVisitCount(container)) {
      return this.patch.TryGetVisitCount(container);
    }

    const containerPathStr = container.path.ToString();
    const count = this.visitCounts.has(containerPathStr) ?
      this.visitCounts.get(containerPathStr) :
      null;
  };

  public readonly IncrementVisitCountForContainer = (
    container: RuntimeContainer,
  ): void => {
    if (this.patch) {
      let currCount = this.VisitCountForContainer(container);
      currCount += 1;
      this.patch.SetVisitCount(container, currCount);

      return;
    }

    const containerPathStr = container.path.ToString();
    let count = this.visitCounts.has(containerPathStr) ?
      this.visitCounts.get(containerPathStr) :
      null;

    if (typeof count !== 'number' || Number.isNaN(count)) {
      count = 0;
    }

    count += 1;

    this.visitCounts.set(containerPathStr, count);
  };

  public readonly RecordTurnIndexVisitToContainer = (
    container: RuntimeContainer,
  ): void => {
    if (!this.patch) {
      this.patch.SetTurnIndex(container, this.currentTurnIndex);
      return;
    }

    const containerPathStr = container.path.ToString();
    this.turnIndices[containerPathStr] = this.currentTurnIndex;
  };

  public readonly TurnsSinceForContainer = (
    container: RuntimeContainer,
  ): number => {
    if (!container.turnIndexShouldBeCounted) {
      this.story.Error(
        `TURNS_SINCE() for target (${container.name} - on ${container.debugMetadata}) unknown.`,
      );
    }

    let index = 0;
    if (this.patch) {
      index = this.patch.TryGetTurnIndex(container);
      if (index !== null) {
        return this.currentTurnIndex - index;
      } 
    }

    const containerPathStr = container.path.ToString();
    index = this.turnIndices.has(containerPathStr) ?
      this.turnIndices.get(containerPathStr) :
      null;

    if (index !== null && index !== undefined) {
      return this.currentTurnIndex - index;
    }

    return -1;
  };

  // Cleans inline whitespace in the following way:
  //  - Removes all whitespace from the start and end of line (including just before a \n)
  //  - Turns all consecutive space and tab runs into single spaces (HTML style)
  public readonly CleanOutputWhitespace = (str: string) => {
    let sb = '';
    let currentWhitespaceStart = -1;
    let startOfLine = 0;
    for (let ii = 0; ii < str.length; ii += 1) {
      const c = str[ii];
      const isInlineWhitespace = c === ' ' || c === '\t';

      if (isInlineWhitespace && currentWhitespaceStart === -1) {
        currentWhitespaceStart = ii;
      }

      if (!isInlineWhitespace) {
        if (c !== '\n' &&
          currentWhitespaceStart > 0 &&
          currentWhitespaceStart !== startOfLine)
        {
          sb += ' ';
        }

        currentWhitespaceStart = -1;
      }

      if (c === '\n') {
        startOfLine = ii + 1;
      }

      if (!isInlineWhitespace) {
        sb += c;
      }
    }

    return sb += 1;
  };
      
  constructor(public readonly _story: RuntimeStory) {
    this._outputStream = [];
    this.OutputStreamDirty();
    this.evaluationStack = [];
    this.callStack = new CallStack(this.story);
    this.variablesState = new VariablesState(
      this.callStack,
      this.story.listDefinitions,
    );

    this._visitCounts = new Map();
    this._turnIndices = new Map();
    this.currentTurnIndex = -1;

    // Seed the shuffle random numbers
    let timeSeed = new Date().getMilliseconds();
    this.storySeed = (new Random(timeSeed)).Next() % 100;
    this.previousRandom = 0;
    this._currentChoices = [];

    this.GoToStart();
  }

  public readonly GoToStart = (): void => {
    this.callStack.currentElement.currentPointer = Pointer.StartOf(
      this.story.mainContentContainer,
    );
  };

  // Warning: Any Runtime.Object content referenced within the StoryState will
  // be re-referenced rather than cloned. This is generally okay though since
  // Runtime.Objects are treated as immutable after they've been set up.
  // (e.g. we don't edit a Runtime.StringValue after it's been created an added.)
  // I wonder if there's a sensible way to enforce that..??
  public readonly CopyAndStartPatching = (): StoryState => {
    const copy = new StoryState(this.story);
    copy._patch = new StatePatch(this.patch);
    copy.outputStream.push(...this.outputStream);
    copy.OutputStreamDirty();

    copy.currentChoices.push(...this.currentChoices);

    if (this.hasError) {
      copy.currentErrors = [ ...this.currentErrors ];
    }

    if (this.hasWarning) {
      copy.currentWarnings = [ ...this.currentWarnings ];
    }

    copy.callStack = new CallStack(this.callStack);

    // ref copy - exactly the same variables state!
    // we're expecting not to read it only while in patch mode
    // (though the callstack will be modified)
    copy.variablesState = this.variablesState;
    copy.variablesState.callStack = copy.callStack;
    copy.variablesState.patch = copy._patch;

    copy.evaluationStack.push(...this.evaluationStack);

    if (!this.divertedPointer.isNull) {
      copy.divertedPointer = this.divertedPointer;
    }

    copy.previousPointer = this.previousPointer;

    // visit counts and turn indicies will be read only, not modified
    // while in patch mode
    copy._visitCounts = this._visitCounts;
    copy._turnIndices = this._turnIndices;

    copy.currentTurnIndex = this.currentTurnIndex;
    copy.storySeed = this.storySeed;
    copy.previousRandom = this.previousRandom;
    copy.didSafeExit = this.didSafeExit;

    return copy;
  };

  public readonly RestoreAfterPatch = (): void => {
    // VariablesState was being borrowed by the patched
    // state, so restore it with our own callstack.
    // _patch will be null normally, but if you're in the
    // middle of a save, it may contain a _patch for save purpsoes.
    this.variablesState.callStack = this.callStack;
    this.variablesState.patch = this.patch; // usually null
  };

  public readonly ApplyAnyPatch = (): void => {
    if (!this.patch) {
      return;
    }

    this.variablesState.ApplyPatch();

    for(const [ key, value ] of this.patch.visitCounts) {
      this.ApplyCountChanges(key, value, true);
    }

    for (const [ key, value ] of this.patch.turnIndices) {
      this.ApplyCountChanges(key, value, false);
    }

    this._patch = null;
  };

  public readonly ApplyCountChanges = (
    container: RuntimeContainer,
    newCount: number,
    isVisit: boolean,
  ) => {
    const counts = isVisit ? this.visitCounts : this.turnIndices;
    counts.set(container.path.ToString(), newCount);
  }

  public readonly GetSerializedRepresentation = () => {
    let hasChoiceThreads = false;
    const writer: Record<string, any> = {};
    for (const c of this.currentChoices) {
      c.originalThreadIndex = c.threadAtGeneration.threadIndex;

      if (this.callStack.ThreadWithIndex(c.originalThreadIndex) === null) {
        if (!hasChoiceThreads) {
          hasChoiceThreads = true;
          writer.choiceThreads = {
            [c.originalThreadIndex]: c.threadAtGeneration.GetSerializedRepresentation(),
          };
        }
      }
    }

    writer.callstackThreads = this.callStack.GetSerializedRepresentation();
    writer.variablesState = this.variablesState.GetSerializedRepresentation();
    writer.evalStack = JsonSerialization.WriteListRuntimeObjs(
      this.evaluationStack,
    );

    writer.outputStream = JsonSerialization.WriteListRuntimeObjs(this.outputStream);

    writer.WriteProperty("currentChoices", w => {
      w.WriteArrayStart();
      for (const c of this.currentChoices) {
        JsonSerialization.WriteChoice(c);
      }

      w.WriteArrayEnd();
    });

    if (!this.divertedPointer.isNull) {
      writer.WriteProperty(
        "currentDivertTarget",
        this.divertedPointer.path.componentsString,
      );
    }

    writer.WriteProperty("visitCounts", w => JsonSerialization.WriteIntDictionary(this.visitCounts));
    writer.WriteProperty("turnIndices", w => JsonSerialization.WriteIntDictionary(this.turnIndices));

    writer.WriteProperty("turnIdx", this.currentTurnIndex);
    writer.WriteProperty("storySeed", this.storySeed);
    writer.WriteProperty("previousRandom", this.previousRandom);

    writer.WriteProperty("inkSaveVersion", this.kInkSaveStateVersion);

    // Not using this right now, but could do in future.
    writer.WriteProperty("inkFormatVersion", this.story.inkVersionCurrent);

    writer.WriteObjectEnd();

    return writer;
  };

  public readonly LoadJsonObj = (jObject: Record<string, any>) => {
    const jSaveVersion = jObject.inkSaveVersion;
    if (!jSaveVersion) {
      throw new StoryError('ink save format incorrect, can\'t load.');
    } else if (jSaveVersion < this.kMinCompatibleLoadVersion) {
      throw new StoryError(
        `Ink save format isn't compatible with the current version (saw '${jSaveVersion}', but minimum is ${this.kMinCompatibleLoadVersion}), so can't load`,
      );
    }

    this.callStack.SetJsonToken(jObject.callstackThreads, this.story);
    this.variablesState.SetJsonToken(jObject.variablesState);

    this.evaluationStack = JsonSerialization.JArrayToRuntimeObjList(
      jObject.evalStack,
    );

    this._outputStream = JsonSerialization.JArrayToRuntimeObjList(
      jObject.outputStream,
    );

    this.OutputStreamDirty();

    this._currentChoices = JsonSerialization.JArrayToRuntimeObjList(
      jObject.currentChoices,
    ) as RuntimeChoice[];

    const currentDivertTargetPath = jObject.currentDivertTarget;
    if (currentDivertTargetPath !== null && currentDivertTargetPath !== undefined) {
      const divertPath = new RuntimePath({
        componentsString: currentDivertTargetPath.ToString(),
      });

      this.divertedPointer = this.story.PointerAtPath(divertPath);
    }

    this._visitCounts = mapFromDict(JsonSerialization.JObjectToIntDictionary(
      jObject.visitCounts,
    ));

    this._turnIndices = mapFromDict(JsonSerialization.JObjectToIntDictionary(
      jObject.turnIndices,
    ));

    this.currentTurnIndex = Number(jObject.turnIdx);
    this.storySeed = Number(jObject.storySeed);

    // Not optional, but bug in inkjs means it's actually missing in inkjs saves
    let previousRandomObj = jObject.previousRandom;
    if (jObject) {
      this.previousRandom = Number(previousRandomObj);
    } else {
      this.previousRandom = 0;
    }

    const jChoiceThreads = jObject.choiceThreads;
    for (const c of this.currentChoices) {
      const foundActiveThread = this.callStack.ThreadWithIndex(
        c.originalThreadIndex,
      );

      if (foundActiveThread) {
        c.threadAtGeneration = foundActiveThread.Copy();
      } else {
        const jSavedChoiceThread = jChoiceThreads[c.originalThreadIndex];
        c.threadAtGeneration = new CallStackThread(
          jSavedChoiceThread,
          this.story,
        );
      }
    }
  }

  public readonly ResetErrors = (): void => {
    this.currentErrors = null;
    this.currentWarnings = null;
  };
  
  public readonly ResetOutput = (objs: RuntimeObject[] = null) => {
    this.outputStream.splice(0, this.outputStream.length);
    if (objs) {
      this.outputStream.push(...objs);
    }

    this.OutputStreamDirty();
  };

  // Push to output stream, but split out newlines in text for consistency
  // in dealing with them later.
  public readonly PushToOutputStream = (obj: RuntimeObject) => {
    const text = obj as StringValue;
    if (text) {
      const listText = this.TrySplittingHeadTailWhitespace(text);
      if (listText !== null && listText !== undefined) {
        for (const textObj of listText) {
          this.PushToOutputStreamIndividual(textObj);
        }

        this.OutputStreamDirty();

        return;
      }
    }

    this.PushToOutputStreamIndividual(obj);
    this.OutputStreamDirty();
  };

  public readonly PopFromOutputStream = (count: number) => {
    this.outputStream.splice(this.outputStream.length - count, count);
    this.OutputStreamDirty();
  };

  // At both the start and the end of the string, split out the new lines like so:
  //
  //  "   \n  \n     \n  the string \n is awesome \n     \n     "
  //      ^-----------^                           ^-------^
  // 
  // Excess newlines are converted into single newlines, and spaces discarded.
  // Outside spaces are significant and retained. "Interior" newlines within 
  // the main string are ignored, since this is for the purpose of gluing only.
  //
  //  - If no splitting is necessary, null is returned.
  //  - A newline on its own is returned in a list for consistency.
  public readonly TrySplittingHeadTailWhitespace = (
    single: StringValue,
  ): StringValue[] => {
    let str = single.value;
    let headFirstNewlineIdx = -1;
    let headLastNewlineIdx = -1;

    for (let ii = 0; ii < str.length; ii += 1) {
      const c = str[ii];
      if (c === '\n') {
        if (headFirstNewlineIdx == -1) {
          headFirstNewlineIdx = ii;
        }

        headLastNewlineIdx = ii;
      } else if (c === ' ' || c === '\t') {
        continue;
      }

      break;
    }

    let tailLastNewlineIdx = -1;
    let tailFirstNewlineIdx = -1;
    for (let ii = str.length - 1; ii >= 0; ii -= 1) {
      let c = str[ii];
      if (c === '\n') {
        if (tailLastNewlineIdx == -1) {
          tailLastNewlineIdx = ii;
        }

        tailFirstNewlineIdx = ii;
      } else if (c == ' ' || c == '\t') {
        continue;
      }

      break;
    }

    // No splitting to be done?
    if (headFirstNewlineIdx == -1 && tailLastNewlineIdx == -1) {
      return null;
    }
   
    const listTexts: StringValue[] = [];
    let innerStrStart = 0;
    let innerStrEnd = str.length;

    if (headFirstNewlineIdx !== -1) {
      if (headFirstNewlineIdx > 0) {
        const leadingSpaces = new StringValue(
          str.slice(0, headFirstNewlineIdx),
        );

        listTexts.push(leadingSpaces);
      }

      listTexts.push(new StringValue('\n'));
      innerStrStart = headLastNewlineIdx + 1;
    }

    if (tailLastNewlineIdx !== -1) {
      innerStrEnd = tailFirstNewlineIdx;
    }

    if (innerStrEnd > innerStrStart) {
      var innerStrText = str.slice(innerStrStart, innerStrEnd - innerStrStart);
      listTexts.push(new StringValue(innerStrText));
    }

    if (tailLastNewlineIdx !== -1 &&
      tailFirstNewlineIdx > headLastNewlineIdx)
    {
      listTexts.push(new StringValue('\n'));
      if (tailLastNewlineIdx < str.length - 1) {
        const numSpaces = (str.length - tailLastNewlineIdx) - 1;
        const trailingSpaces = new StringValue(
          str.slice(tailLastNewlineIdx + 1, numSpaces),
        );

        listTexts.push(trailingSpaces);
      }
    }

    return listTexts;
  };

  public readonly PushToOutputStreamIndividual = (
    obj: RuntimeObject,
  ) => {
    const glue = obj as RuntimeGlue;
    const text = obj as StringValue;
    let includeInOutput = true;

    if (glue) {
      // New glue, so chomp away any whitespace from the end of the stream
      this.TrimNewlinesFromOutputStream();
      includeInOutput = true;
    } else if (text) {
      // New text: do we really want to append it, if it's whitespace?
      // Two different reasons for whitespace to be thrown away:
      //   - Function start/end trimming
      //   - User defined glue: <>
      // We also need to know when to stop trimming, when there's non-whitespace.

      // Where does the current function call begin?
      let functionTrimIndex = -1;
      const currEl = this.callStack.currentElement;
      if (currEl.type === PushPopType.Function) {
        functionTrimIndex = currEl.functionStartInOuputStream;
      }

      // Do 2 things:
      //  - Find latest glue
      //  - Check whether we're in the middle of string evaluation
      // If we're in string eval within the current function, we
      // don't want to trim back further than the length of the current string.
      let glueTrimIndex = -1;
      for (let ii = this.outputStream.length - 1; ii >= 0; ii -= 1) {
        const o = this.outputStream[ii];
        const c: RuntimeControlCommand = o instanceof RuntimeControlCommand ?
          o :
          null;

        const g: RuntimeGlue = o instanceof RuntimeGlue ? o : null;

        if (g) {
          // Find latest glue
          glueTrimIndex = ii;
          break;
        } else if (c && c.commandType === CommandType.BeginString) {
          // Don't function-trim past the start of a string evaluation section
          if (ii >= functionTrimIndex) {
            functionTrimIndex = -1;
          }

          break;
        }
      }

      // Where is the most agressive (earliest) trim point?
      let trimIndex = -1;
      if (glueTrimIndex !== -1 && functionTrimIndex !== -1) {
        trimIndex = Math.min(functionTrimIndex, glueTrimIndex);
      } else if (glueTrimIndex !== -1) {
        trimIndex = glueTrimIndex;
      } else {
        trimIndex = functionTrimIndex;
      }

      // So, are we trimming then?
      if (trimIndex != -1) {
        if (text.isNewline) {
          // While trimming, we want to throw all newlines away,
          // whether due to glue or the start of a function
          includeInOutput = false;
        } else if (text.isNonWhitespace) {
          // Able to completely reset when normal text is pushed
          if (glueTrimIndex > -1) {
            this.RemoveExistingGlue();
          }

          // Tell all functions in callstack that we have seen proper text,
          // so trimming whitespace at the start is done.
          if (functionTrimIndex > -1) {
            const callstackElements = this.callStack.elements;
            for (let ii = callstackElements.length - 1; ii >= 0; ii -= 1) {
              const el = callstackElements[ii];
              if (el.type === PushPopType.Function) {
                el.functionStartInOuputStream = -1;
              }

              break;
            }
          }
        }
      } else if (text.isNewline) {
        // De-duplicate newlines, and don't ever lead with a newline
        if (this.outputStreamEndsInNewline || !this.outputStreamContainsContent) {
          includeInOutput = false;
        }
      }
    }

    if (includeInOutput) {
      this.outputStream.push(obj);
      this.OutputStreamDirty();
    }
  };

  public readonly TrimNewlinesFromOutputStream = (): void => {
    let removeWhitespaceFrom = -1;

    // Work back from the end, and try to find the point where
    // we need to start removing content.
    //  - Simply work backwards to find the first newline in a string of whitespace
    // e.g. This is the content   \n   \n\n
    //                            ^---------^ whitespace to remove
    //                        ^--- first while loop stops here
    let ii = this.outputStream.length - 1;
    while (ii >= 0) {
      const obj = this.outputStream[ii];
      const cmd = obj instanceof RuntimeControlCommand ? obj : null;
      const txt = obj instanceof StringValue ? obj : null;

      if (cmd || (txt && txt.isNonWhitespace)) {
        break;
      } else if (txt && txt.isNewline) {
        removeWhitespaceFrom = ii;
      }

      ii--;
    }

    // Remove the whitespace
    if (removeWhitespaceFrom >= 0) {
      ii = removeWhitespaceFrom;
      while (ii < this.outputStream.length) {
        const text = this.outputStream[ii] as StringValue;
        if (text) {
          this.outputStream.splice(ii, 1);
        } else {
          ii += 1;
        }
      }
    }

    this.OutputStreamDirty();
  };

  // Only called when non-whitespace is appended
  public readonly RemoveExistingGlue = () => {
    for (let ii = this.outputStream.length - 1; ii >= 0; ii--) {
      const c = this.outputStream[ii];
      if (c instanceof RuntimeGlue) {
        this.outputStream.splice(ii, 1);
      } else if (c instanceof RuntimeControlCommand) {
        // e.g. BeginString
        break;
      }
    }

    this.OutputStreamDirty();
  };

  public readonly PushEvaluationStack = (obj: RuntimeObject): void => {
    // Include metadata about the origin List for list values when
    // they're used, so that lower level functions can make use
    // of the origin list to get related items, or make comparisons
    // with the integer values etc.
    const listValue = obj instanceof ListValue ? obj : null;
    if (listValue) {
      // Update origin when list is has something to indicate the list origin
      const rawList = listValue.value;
      if (rawList.originNames) {
        if (!rawList.origins) {
          rawList.origins = [];
        }

        rawList.origins.splice(0, rawList.origins.length);

        for (const n of rawList.originNames) {
          const def = this.story.listDefinitions.GetListDefinition(n);
          if (!rawList.origins.includes(def)) {
            rawList.origins.push(def);
          }
        }
      }

      this.evaluationStack.push(obj);
    }
  };

  public readonly PopEvaluationStack = <T extends number | undefined = undefined>(
    numberOfObjects?: T,
  ): T extends (1 | undefined) ? RuntimeObject : RuntimeObject[] => {
    if (numberOfObjects > this.evaluationStack.length) {
      throw new Error('Trying to pop too many objects.');
    }

    const popped = this.evaluationStack.slice(
      this.evaluationStack.length - numberOfObjects,
      numberOfObjects,
    );

    this.evaluationStack.splice(
      this.evaluationStack.length - numberOfObjects,
      numberOfObjects,
    );

    return (popped.length > 1 ? popped : popped[0]) as any;
  };

  public readonly PeekEvaluationStack = (): RuntimeObject => (
    this.evaluationStack[this.evaluationStack.length - 1]
  );

  /// <summary>
  /// Ends the current ink flow, unwrapping the callstack but without
  /// affecting any variables. Useful if the ink is (say) in the middle
  /// a nested tunnel, and you want it to reset so that you can divert
  /// elsewhere using ChoosePathString(). Otherwise, after finishing
  /// the content you diverted to, it would continue where it left off.
  /// Calling this is equivalent to calling -> END in ink.
  /// </summary>
  public readonly ForceEnd = () => {
    this.callStack.Reset();
    this.currentChoices.splice(0, this.currentChoices.length);
    this.currentPointer = Pointer.Null;
    this.previousPointer = Pointer.Null;
    this.didSafeExit = true;
  };

  // Add the end of a function call, trim any whitespace from the end.
  // We always trim the start and end of the text that a function produces.
  // The start whitespace is discard as it is generated, and the end
  // whitespace is trimmed in one go here when we pop the function.
  public readonly TrimWhitespaceFromFunctionEnd = () => {
    if (this.callStack.currentElement.type !== PushPopType.Function) {
      throw new Error('Current element was not of type function.');
    }

    var functionStartPoint = this.callStack.currentElement.functionStartInOuputStream;

    // If the start point has become -1, it means that some non-whitespace
    // text has been pushed, so it's safe to go as far back as we're able.
    if (functionStartPoint == -1) {
        functionStartPoint = 0;
    }

    // Trim whitespace from END of function call
    for (let ii = this.outputStream.length - 1; ii >= functionStartPoint; ii--) {
      const obj = this.outputStream[ii];
      const txt = obj instanceof StringValue ? obj : null;
      const cmd = obj instanceof RuntimeControlCommand ?  obj : null;
      if (!txt) {
        continue;
      } if (cmd) {
        break;
      } else if (txt.isNewline || txt.isInlineWhitespace) {
        this.outputStream.splice(ii, 1);
        this.OutputStreamDirty();
      }

      break;
    }
  }

  public readonly PopCallstack = (popType: PushPopType = null): void => {
    // Add the end of a function call, trim any whitespace from the end.
    if (this.callStack.currentElement.type === PushPopType.Function) {
      this.TrimWhitespaceFromFunctionEnd();
    }

    this.callStack.Pop(popType);
  };

  // Don't make public since the method need to be wrapped in Story for visit counting
  public readonly SetChosenPath = (
    path: RuntimePath,
    incrementingTurnIndex: boolean,
  ): void => {
    // Changing direction, assume we need to clear current set of choices
    this.currentChoices.splice(0, this.currentChoices.length);

    const newPointer = this.story.PointerAtPath(path);
    if (!newPointer.isNull && newPointer.index === -1) {
      newPointer.index = 0;
    }

    this.currentPointer = newPointer;

    if (incrementingTurnIndex) {
      this.currentTurnIndex += 1;
    }
  };

  public readonly StartFunctionEvaluationFromGame = (
    funcContainer: RuntimeContainer,
    ...args: any[]
  ): void => {
    this.callStack.Push(
      PushPopType.FunctionEvaluationFromGame,
      this.evaluationStack.length,
    );

    this.callStack.currentElement.currentPointer = Pointer.StartOf(
      funcContainer,
    );

    this.PassArgumentsToEvaluationStack(args);
  };

  public readonly PassArgumentsToEvaluationStack = (...args: any[]): void => {
    // Pass arguments onto the evaluation stack
    for (let ii = 0; ii < args.length; ii += 1) {
      if (typeof args[ii] !== 'number' &&
        typeof args[ii] !== 'string' &&
        args[ii] instanceof RuntimeInkList)
      {
        throw new Error(
          `ink arguments when calling EvaluateFunction / ChoosePathStringWithParameters must be number, string or InkList. Argument was ${args[ii] === null ? 'null' : typeof args[ii]}`,
        );
      }

      this.PushEvaluationStack(Value.Create(args[ii]));
    }
  };
  
  public readonly TryExitFunctionEvaluationFromGame = (): boolean => {
    if (this.callStack.currentElement.type === PushPopType.FunctionEvaluationFromGame) {
      this.currentPointer = Pointer.Null;
      this.didSafeExit = true;

      return true;
    }

    return false;
  };

  public readonly CompleteFunctionEvaluationFromGame = (): any => {
    if (this.callStack.currentElement.type !== PushPopType.FunctionEvaluationFromGame) {
      throw new StoryError(
        `Expected external function evaluation to be complete. Stack trace: ${this.callStack.callStackTrace}`,
      );
    }

    let originalEvaluationStackHeight = this.callStack.currentElement.evaluationStackHeightWhenPushed;

    // Do we have a returned value?
    // Potentially pop multiple values off the stack, in case we need
    // to clean up after ourselves (e.g. caller of EvaluateFunction may 
    // have passed too many arguments, and we currently have no way to check for that)
    let returnedObj: RuntimeObject = null;
    while (this.evaluationStack.length > originalEvaluationStackHeight) {
      const poppedObj = this.PopEvaluationStack();
      if (returnedObj === null || returnedObj === undefined) {
        returnedObj = poppedObj;
      }
    }

    // Finally, pop the external function evaluation
    this.PopCallstack(PushPopType.FunctionEvaluationFromGame);

    // What did we get back?
    if (returnedObj) {
      if (returnedObj instanceof Void) {
        return null;
      }

      // Some kind of value, if not void
      const returnVal = returnedObj as Value;

      // DivertTargets get returned as the string of components
      // (rather than a Path, which isn't public)
      if (returnVal.valueType === ValueType.DivertTarget) {
        return String(returnVal.valueObject);
      }

      // Other types can just have their exact object type:
      // int, float, string. VariablePointers get returned as strings.
      return returnVal.valueObject;
    }

    return null;
  };

  public readonly AddError = (message: string, isWarning: boolean): void => {
    if (!isWarning) {
      if (!this.currentErrors) {
        this.currentErrors = [];
      }

      this.currentErrors.push(message);
    } else {
      if (!this.currentWarnings) {
        this.currentWarnings = [];
      }

      this.currentWarnings.push(message);
    }
  };

  public readonly OutputStreamDirty = (): void => {
    this._outputStreamTextDirty = true;
    this._outputStreamTagsDirty = true;
  };
}


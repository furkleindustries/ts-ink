import {
  CallStack,
} from '../CallStack/CallStack';
import {
  FloatValue,
} from '../Value/FloatValue';
import {
  IntValue,
} from '../Value/IntValue';
import {
  JsonSerialization,
} from '../JsonSerialization';
import {
  ListDefinitionsOrigin,
} from '../ListDefinitionsOrigin';
import {
  ListValue,
} from '../Value/ListValue';
import {
  RuntimeObject,
} from '../Object';
import {
  StatePatch,
} from '../Story/StatePatch';
import {
  Value,
} from '../Value/Value';
import {
  RuntimeVariableAssignment,
} from './VariableAssignment';
import {
  VariablePointerValue,
} from '../Value/VariablePointerValue';

type VariableChanged = (variableName: string, newValue: Value) => void;

/// <summary>
/// Encompasses all the global variables in an ink Story, and
/// allows binding of a VariableChanged event so that that game
/// code can be notified whenever the global variables change.
/// </summary>
export class VariablesState {
  public variableChangedEvent?: VariableChanged;

  private _globalVariables: Map<string, Value> = new Map();
  get globalVariables() {
    return this._globalVariables;
  }

  private _defaultGlobalVariables: Map<string, Value> = new Map();
  get defaultGlobalVariables() {
    return this._defaultGlobalVariables;
  }

  // Used for accessing temporary variables
  get callStack() {
    return this._callStack;
  }

  set callStack(value: CallStack) {
    this._callStack = value;
  }

  private _changedVariablesForBatchObs: Set<string> | null = new Set();
  get changedVariablesForBatchObs() {
    return this._changedVariablesForBatchObs;
  }

  get listDefsOrigin() {
    return this._listDefsOrigin;
  }

  private _patch: StatePatch | null = null;
  get patch() {
    return this._patch;
  }

  set patch(value: StatePatch | null) {
    this._patch = value;
  }

  private _batchObservingVariableChanges: boolean = false;
  get batchObservingVariableChanges(): boolean { 
    return this._batchObservingVariableChanges;
  }

  set batchObservingVariableChanges(value: boolean) { 
    this._batchObservingVariableChanges = value;
    if (value) {
      this._changedVariablesForBatchObs = new Set();
    } else {
      // Finished observing variables in a batch - now send 
      // notifications for changed variables all in one go.
      if (this.changedVariablesForBatchObs) {
        for (const variableName of this.changedVariablesForBatchObs) {
          const currentValue = this.globalVariables.get(variableName);
          if (this.variableChangedEvent && currentValue) {
            this.variableChangedEvent(variableName, currentValue);
          }
        }
      }

      this._changedVariablesForBatchObs = null;
    }
  }

  /// <summary>
  /// Get or set the value of a named global ink variable.
  /// The types available are the standard ink types.
  /// </summary>
  public readonly $ = (variableName: string) => {
    if (this.patch) {
      const global = this.patch.GetGlobal(variableName);
      if (global) {
        return (global as Value).value;
      }
    }

    // Search main dictionary first.
    // If it's not found, it might be because the story content has changed,
    // and the original default value hasn't be instantiated.
    // Should really warn somehow, but it's difficult to see how...!
    const global = this.globalVariables.get(variableName);
    const def = this.defaultGlobalVariables.get(variableName); 
    if (global || def) {
      return ((global || def) as Value).value;
    }

    return null;
  };

  constructor(private _callStack: CallStack, private _listDefsOrigin: ListDefinitionsOrigin)
  {}

  public readonly ApplyPatch = (): void => {
    if (!this.patch) {
      throw new Error();
    }

    for (const [ key, value ] of this.patch.globals) {
      if (value) {
        this.globalVariables.set(key, value);
      }
    }

    if (this.changedVariablesForBatchObs) {
      for (const name of this.patch.changedVariables) {
        this.changedVariablesForBatchObs.add(name);
      }
    }

    this._patch = null;
  };

  public readonly SetJsonToken = (jToken: Record<string, any>) => {
    this.globalVariables.clear();

    for (const [ key, value ] of this.defaultGlobalVariables) {
      if (key in jToken) {
        this.globalVariables.set(
          key,
          JsonSerialization.JTokenToRuntimeObject(jToken[key]) as Value,
        );
      } else {
        this.globalVariables.set(key, value);
      }
    }
  };

  /// <summary>
  /// When saving out JSON state, we can skip saving global values that
  /// remain equal to the initial values that were declared in ink.
  /// This makes the save file (potentially) much smaller assuming that
  /// at least a portion of the globals haven't changed. However, it
  /// can also take marginally longer to save in the case that the 
  /// majority HAVE changed, since it has to compare all globals.
  /// It may also be useful to turn this off for testing worst case
  /// save timing.
  /// </summary>
  public static dontSaveDefaultValues = true;

  public readonly GetSerializedRepresentation = () => {
    const writer: Record<string, any> = {};
    for (const [ key, value ] of this.globalVariables) {
      if (VariablesState.dontSaveDefaultValues) {
        // Don't write out values that are the same as the default global values
        if (this.defaultGlobalVariables.has(key)) {
          if (this.RuntimeObjectsEqual(this.defaultGlobalVariables.get(key), value)) {
            continue;
          }
        }
      }


      writer[name] = JsonSerialization.WriteRuntimeObject(value);
    }
  };

  public readonly RuntimeObjectsEqual = (
    obj1: RuntimeObject | null | undefined,
    obj2: RuntimeObject | null | undefined,
  ): boolean => {
    if (obj1 === null ||
      obj1 === undefined ||
      obj2 === null ||
      obj2 === undefined)
    {
      return false;
    } else if (typeof obj1 !== typeof obj2) {
      return false;
    }

    // Perform equality on int/float manually to avoid boxing
    const intVal = obj1 instanceof IntValue ? obj1 : null;
    if (intVal) {
      const valObj = obj2 instanceof IntValue ? obj2 : { value: {} };
      return intVal.value === valObj.value;
    }

    const floatVal = obj1 instanceof FloatValue ? obj1 : null;
    if (floatVal) {
      const valObj = obj2 instanceof FloatValue ? obj2 : { value: {} };
      return floatVal.value === valObj.value;
    }

    // Other Value type (using proper Equals: list, string, divert path)
    const val1 = obj1 instanceof Value ? obj1 : null;
    const val2 = obj2 instanceof Value ? obj2 : null;
    if (val1 && val2) {
      return val1.value.Equals(val2.value);
    }

    throw new Error(`FastRoughDefinitelyEquals: Unsupported runtime object type: ${typeof obj1}`);
  }

  public readonly GetVariableWithName = (
    name: string,
    contextIndex = -1,
  ): RuntimeObject | null => {
    let varValue: RuntimeObject | null = this.GetRawVariableWithName(name, contextIndex);

    // Get value from pointer?
    const varPointer = varValue instanceof VariablePointerValue ? varValue : null;
    if (varPointer) {
      varValue = this.ValueAtVariablePointer(varPointer);
    }

    return varValue;
  };

  public readonly GetDefaultVariableValue = (name: string): RuntimeObject | null => (
    this.defaultGlobalVariables.get(name) || null
  );

  public readonly GlobalVariableExistsWithName = (name: string): boolean => (
    this.globalVariables.has(name) ||
      this.defaultGlobalVariables &&
      this.defaultGlobalVariables.has(name)
  );

  public readonly GetRawVariableWithName = (
    name: string,
    contextIndex: number,
  ): Value | null => {
    let varValue: Value | null = null;

    // 0 context = global
    if (contextIndex == 0 || contextIndex == -1) {
      if (this.patch && this.patch.globals.has(name)) {
        return this.patch.GetGlobal(name);
      }

      if (this.globalVariables.has(name)) {
        return this.globalVariables.get(name) || null;
      }

      // Getting variables can actually happen during globals set up since you can do
      //  VAR x = A_LIST_ITEM
      // So _defaultGlobalVariables may be null.
      // We need to do this check though in case a new global is added, so we need to
      // revert to the default globals dictionary since an initial value hasn't yet been set.
      if (this._defaultGlobalVariables && this.defaultGlobalVariables.has(name)) {
        return this.defaultGlobalVariables.get(name) || null;
      }

      const listItemValue = this.listDefsOrigin.FindSingleItemListWithName(
        name,
      );

      if (listItemValue) {
        return listItemValue;
      }
    } 

    // Temporary
    varValue = this.callStack.GetTemporaryVariableWithName(name, contextIndex) as Value;

    return varValue;
  };

  public readonly ValueAtVariablePointer = (
    pointer: VariablePointerValue,
  ): RuntimeObject | null => (
    this.GetVariableWithName(pointer.variableName, pointer.contextIndex)
  );

  public readonly Assign = (
    varAss: RuntimeVariableAssignment,
    value: Value,
  ): void => {
    let name = varAss.variableName;
    let contextIndex = -1;

    // Are we assigning to a global variable?
    let setGlobal = false;
    if (varAss.isNewDeclaration) {
      setGlobal = varAss.isGlobal;
    } else {
      setGlobal = this.GlobalVariableExistsWithName(name);
    }

    if (varAss.isNewDeclaration) {
      // Constructing new variable pointer reference
      const varPointer = value instanceof VariablePointerValue ?
        value :
        null;

      if (varPointer) {
        const fullyResolvedVariablePointer = this.ResolveVariablePointer(varPointer);
        value = fullyResolvedVariablePointer;
      }
    } else {
      // Assign to existing variable pointer?
      // Then assign to the variable that the pointer is pointing to by name.

      // De-reference variable reference to point to
      let existingPointer: VariablePointerValue | null = null;
      do {
        existingPointer = this.GetRawVariableWithName(
          name,
          contextIndex,
        ) as VariablePointerValue;

        if (existingPointer) {
          name = existingPointer.variableName;
          contextIndex = existingPointer.contextIndex;
          setGlobal = contextIndex === 0;
        }
      } while(existingPointer);
    }

    if (setGlobal) {
      this.SetGlobal(name, value);
    } else {
      this.callStack.SetTemporaryVariable(
        name,
        value,
        varAss.isNewDeclaration,
        contextIndex,
      );
    }
  };

  public readonly SnapshotDefaultGlobals = (): void => {
    this._defaultGlobalVariables = new Map(this._globalVariables);
  };

  public readonly RetainListOriginsForAssignment = (
    oldValue: RuntimeObject, newValue: RuntimeObject,
  ): void => {
    const oldList = oldValue instanceof ListValue ? oldValue : null;
    const newList = newValue instanceof ListValue ? newValue : null;
    if (oldList &&
      oldList.value &&
      newList &&
      newList.value &&
      !newList.value.Size())
    {
      newList.value.SetInitialOriginNames (oldList.value.originNames);
    }
  };

  public readonly SetGlobal = (
    variableName: string,
    value: Value,
  ): void => {
    let oldValue: Value | null = null;
    if (!this.patch || !this.patch.globals.has(variableName)) {
      oldValue = this.globalVariables.get(variableName) || null;
    }

    if (!oldValue) {
      throw new Error();
    }

    ListValue.RetainListOriginsForAssignment(oldValue, value);

    if (this.patch) {
      this.patch.SetGlobal(variableName, value);
    } else {
      this.globalVariables.set(variableName, value);
    }

    if (this.variableChangedEvent && !value.Equals(oldValue)) {
      if (this.batchObservingVariableChanges) {
        if (this.patch) {
          this.patch.AddChangedVariable(variableName);
        } else if(this.changedVariablesForBatchObs) {
          this.changedVariablesForBatchObs.add(variableName);
        }
      } else {
        this.variableChangedEvent(variableName, value);
      }
    }
  };

  // Given a variable pointer with just the name of the target known, resolve to a variable
  // pointer that more specifically points to the exact instance: whether it's global,
  // or the exact position of a temporary on the callstack.
  public readonly ResolveVariablePointer = (
    varPointer: VariablePointerValue,
  ): VariablePointerValue => {
    let contextIndex = varPointer.contextIndex;
    if (contextIndex === -1) {
      contextIndex = this.GetContextIndexOfVariableNamed(varPointer.variableName);
    }

    const valueOfVariablePointedTo = this.GetRawVariableWithName(
      varPointer.variableName,
      contextIndex,
    );

    // Extra layer of indirection:
    // When accessing a pointer to a pointer (e.g. when calling nested or 
    // recursive functions that take a variable references, ensure we don't create
    // a chain of indirection by just returning the final target.
    const doubleRedirectionPointer = valueOfVariablePointedTo instanceof VariablePointerValue ?
      valueOfVariablePointedTo :
      null;

    if (doubleRedirectionPointer) {
      return doubleRedirectionPointer;
    } 

    // Make copy of the variable pointer so we're not using the value direct from
    // the runtime. Temporary must be local to the current scope.
    return new VariablePointerValue (varPointer.variableName, contextIndex);
  };

  // 0  if named variable is global
  // 1+ if named variable is a temporary in a particular call stack element
  public readonly GetContextIndexOfVariableNamed = (
    varName: string,
  ): number => {
    if (this.GlobalVariableExistsWithName(varName)) {
      return 0;
    }

    return this.callStack.currentElementIndex;
  };
}

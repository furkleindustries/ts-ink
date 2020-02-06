import { Value } from '../Value/Value';
import { JsonSerialization } from '../JsonSerialization';
import { IntValue } from '../Value/IntValue';
import { FloatValue } from '../Value/FloatValue';
import { VariablePointerValue } from '../Value/VariablePointerValue';
import { ListValue } from '../Value/ListValue';
/// <summary>
/// Encompasses all the global variables in an ink Story, and
/// allows binding of a VariableChanged event so that that game
/// code can be notified whenever the global variables change.
/// </summary>
export class VariablesState {
    constructor(_callStack, _listDefsOrigin) {
        this._callStack = _callStack;
        this._listDefsOrigin = _listDefsOrigin;
        this._globalVariables = new Map();
        this._defaultGlobalVariables = new Map();
        /// <summary>
        /// Get or set the value of a named global ink variable.
        /// The types available are the standard ink types.
        /// </summary>
        this.$ = (variableName) => {
            if (this.patch) {
                const global = this.patch.GetGlobal(variableName);
                if (global) {
                    return global.valueObject;
                }
            }
            // Search main dictionary first.
            // If it's not found, it might be because the story content has changed,
            // and the original default value hasn't be instantiated.
            // Should really warn somehow, but it's difficult to see how...!
            const global = this.globalVariables.get(variableName);
            const def = this.defaultGlobalVariables.get(variableName);
            if (global || def) {
                return (global || def).valueObject;
            }
            return null;
        };
        this.ApplyPatch = () => {
            for (const [key, value] of this.patch.globals) {
                this.globalVariables.set(key, value);
            }
            if (this.changedVariablesForBatchObs) {
                for (const name of this.patch.changedVariables) {
                    this.changedVariablesForBatchObs.add(name);
                }
            }
            this._patch = null;
        };
        this.SetJsonToken = (jToken) => {
            this.globalVariables.clear();
            for (const [key, value] of this.defaultGlobalVariables) {
                if (key in jToken) {
                    this.globalVariables.set(key, JsonSerialization.JTokenToRuntimeObject(jToken[key]));
                }
                else {
                    this.globalVariables.set(key, value);
                }
            }
        };
        this.GetSerializedRepresentation = () => {
            const writer = {};
            for (const [key, value] of this.globalVariables) {
                if (VariablesState.dontSaveDefaultValues) {
                    // Don't write out values that are the same as the default global values
                    let defaultVal;
                    if (this.defaultGlobalVariables.has(key)) {
                        if (this.RuntimeObjectsEqual(this.defaultGlobalVariables.get(key), defaultVal)) {
                            continue;
                        }
                    }
                }
                writer[name] = JsonSerialization.WriteRuntimeObject(value);
            }
        };
        this.RuntimeObjectsEqual = (obj1, obj2) => {
            if (typeof obj1 !== typeof obj2) {
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
            if (val1) {
                return val1.valueObject.Equals(val2.valueObject);
            }
            throw new Error(`FastRoughDefinitelyEquals: Unsupported runtime object type: ${typeof obj1}`);
        };
        this.GetVariableWithName = (name, contextIndex = -1) => {
            let varValue = this.GetRawVariableWithName(name, contextIndex);
            // Get value from pointer?
            const varPointer = varValue instanceof VariablePointerValue ? varValue : null;
            if (varPointer) {
                varValue = this.ValueAtVariablePointer(varPointer);
            }
            return varValue;
        };
        this.TryGetDefaultVariableValue = (name) => (this.defaultGlobalVariables.has(name) ?
            this.defaultGlobalVariables.get(name) :
            null);
        this.GlobalVariableExistsWithName = (name) => (this.globalVariables.has(name) ||
            this.defaultGlobalVariables &&
                this.defaultGlobalVariables.has(name));
        this.GetRawVariableWithName = (name, contextIndex) => {
            let varValue = null;
            // 0 context = global
            if (contextIndex == 0 || contextIndex == -1) {
                if (this.patch && this.patch.globals.has(name)) {
                    return this.patch.GetGlobal(name);
                }
                if (this.globalVariables.has(name)) {
                    return this.globalVariables.get(name);
                }
                // Getting variables can actually happen during globals set up since you can do
                //  VAR x = A_LIST_ITEM
                // So _defaultGlobalVariables may be null.
                // We need to do this check though in case a new global is added, so we need to
                // revert to the default globals dictionary since an initial value hasn't yet been set.
                if (this._defaultGlobalVariables && this.defaultGlobalVariables.has(name)) {
                    return this.defaultGlobalVariables.get(name);
                }
                const listItemValue = this.listDefsOrigin.FindSingleItemListWithName(name);
                if (listItemValue) {
                    return listItemValue;
                }
            }
            // Temporary
            varValue = this.callStack.GetTemporaryVariableWithName(name, contextIndex);
            return varValue;
        };
        this.ValueAtVariablePointer = (pointer) => (this.GetVariableWithName(pointer.variableName, pointer.contextIndex));
        this.Assign = (varAss, value) => {
            let name = varAss.variableName;
            let contextIndex = -1;
            // Are we assigning to a global variable?
            let setGlobal = false;
            if (varAss.isNewDeclaration) {
                setGlobal = varAss.isGlobal;
            }
            else {
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
            }
            else {
                // Assign to existing variable pointer?
                // Then assign to the variable that the pointer is pointing to by name.
                // De-reference variable reference to point to
                let existingPointer = null;
                do {
                    existingPointer = this.GetRawVariableWithName(name, contextIndex);
                    if (existingPointer) {
                        name = existingPointer.variableName;
                        contextIndex = existingPointer.contextIndex;
                        setGlobal = contextIndex === 0;
                    }
                } while (existingPointer);
            }
            if (setGlobal) {
                this.SetGlobal(name, value);
            }
            else {
                this.callStack.SetTemporaryVariable(name, value, varAss.isNewDeclaration, contextIndex);
            }
        };
        this.SnapshotDefaultGlobals = () => {
            this._defaultGlobalVariables = new Map(this._globalVariables);
        };
        this.RetainListOriginsForAssignment = (oldValue, newValue) => {
            const oldList = oldValue instanceof ListValue ? oldValue : null;
            const newList = newValue instanceof ListValue ? newValue : null;
            if (oldList && newList && !newList.value.Size()) {
                newList.value.SetInitialOriginNames(oldList.value.originNames);
            }
        };
        this.SetGlobal = (variableName, value) => {
            let oldValue = null;
            if (this.patch === null || !this.patch.globals.has(variableName)) {
                oldValue = this.globalVariables.get(variableName);
            }
            ListValue.RetainListOriginsForAssignment(oldValue, value);
            if (this.patch) {
                this.patch.SetGlobal(variableName, value);
            }
            else {
                this.globalVariables.set(variableName, value);
            }
            if (this.variableChangedEvent && !value.Equals(oldValue)) {
                if (this.batchObservingVariableChanges) {
                    if (this.patch) {
                        this.patch.AddChangedVariable(variableName);
                    }
                    else if (this.changedVariablesForBatchObs) {
                        this.changedVariablesForBatchObs.add(variableName);
                    }
                }
                else {
                    this.variableChangedEvent(variableName, value);
                }
            }
        };
        // Given a variable pointer with just the name of the target known, resolve to a variable
        // pointer that more specifically points to the exact instance: whether it's global,
        // or the exact position of a temporary on the callstack.
        this.ResolveVariablePointer = (varPointer) => {
            let contextIndex = varPointer.contextIndex;
            if (contextIndex === -1) {
                contextIndex = this.GetContextIndexOfVariableNamed(varPointer.variableName);
            }
            const valueOfVariablePointedTo = this.GetRawVariableWithName(varPointer.variableName, contextIndex);
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
            return new VariablePointerValue(varPointer.variableName, contextIndex);
        };
        // 0  if named variable is global
        // 1+ if named variable is a temporary in a particular call stack element
        this.GetContextIndexOfVariableNamed = (varName) => {
            if (this.GlobalVariableExistsWithName(varName)) {
                return 0;
            }
            return this.callStack.currentElementIndex;
        };
    }
    get globalVariables() {
        return this._globalVariables;
    }
    get defaultGlobalVariables() {
        return this._defaultGlobalVariables;
    }
    // Used for accessing temporary variables
    get callStack() {
        return this._callStack;
    }
    set callStack(value) {
        this._callStack = value;
    }
    get changedVariablesForBatchObs() {
        return this._changedVariablesForBatchObs;
    }
    get listDefsOrigin() {
        return this._listDefsOrigin;
    }
    get patch() {
        return this._patch;
    }
    set patch(value) {
        this._patch = value;
    }
    get batchObservingVariableChanges() {
        return this._batchObservingVariableChanges;
    }
    set batchObservingVariableChanges(value) {
        this._batchObservingVariableChanges = value;
        if (value) {
            this._changedVariablesForBatchObs = new Set();
        }
        else {
            // Finished observing variables in a batch - now send 
            // notifications for changed variables all in one go.
            if (this._changedVariablesForBatchObs) {
                for (const variableName of this.changedVariablesForBatchObs) {
                    const currentValue = this.globalVariables[variableName];
                    this.variableChangedEvent(variableName, currentValue);
                }
            }
            this._changedVariablesForBatchObs = null;
        }
    }
}
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
VariablesState.dontSaveDefaultValues = true;
//# sourceMappingURL=VariablesState.js.map
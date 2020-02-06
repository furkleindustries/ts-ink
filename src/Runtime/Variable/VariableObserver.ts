/// <summary>
/// Delegate definition for variable observation - see ObserveVariable.
/// </summary>
export type VariableObserver = (variableName: string, newValue: any) => void;

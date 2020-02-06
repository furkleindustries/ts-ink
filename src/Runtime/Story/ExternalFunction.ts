/// <summary>
/// General purpose delegate definition for bound EXTERNAL function definitions
/// from ink. Note that this version isn't necessary if you have a function
/// with three arguments or less - see the overloads of BindExternalFunction.
/// </summary>
export type ExternalFunction = (...args: any[]) => any;

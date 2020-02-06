import { RuntimeInkList } from './List/InkList';
import { RuntimeObject } from './Object';
import { Value } from './Value/Value';
import { ValueType } from './Value/ValueType';
export declare type UnaryOp<T> = (val: T) => any;
export declare type BinaryOp<T> = (left: T, right: T) => any;
export declare class NativeFunctionCall extends RuntimeObject {
    private static _nativeFunctions;
    static get nativeFunctions(): Record<string, NativeFunctionCall>;
    private _prototype;
    get prototype(): NativeFunctionCall;
    private _isPrototype;
    get isPrototype(): boolean;
    private static _operationFuncs;
    static get operationFuncs(): Map<ValueType, UnaryOp<any> | BinaryOp<any>>;
    static readonly Add = "+";
    static readonly Subtract = "-";
    static readonly Divide = "/";
    static readonly Multiply = "*";
    static readonly Mod = "%";
    static readonly Negate = "_";
    static readonly Equal = "==";
    static readonly Greater = ">";
    static readonly Less = "<";
    static readonly GreaterThanOrEquals = ">=";
    static readonly LessThanOrEquals = "<=";
    static readonly NotEquals = "!=";
    static readonly Not = "!";
    static readonly And = "&&";
    static readonly Or = "||";
    static readonly Min = "MIN";
    static readonly Max = "MAX";
    static readonly Pow = "POW";
    static readonly Floor = "FLOOR";
    static readonly Ceiling = "CEILING";
    static readonly Int = "INT";
    static readonly Float = "FLOAT";
    static readonly Has = "?";
    static readonly Hasnt = "!?";
    static readonly Intersect = "^";
    static readonly ListMin = "LIST_MIN";
    static readonly ListMax = "LIST_MAX";
    static readonly All = "LIST_ALL";
    static readonly Count = "LIST_COUNT";
    static readonly ValueOfList = "LIST_VALUE";
    static readonly Invert = "LIST_INVERT";
    static readonly CallWithName: (functionName: string) => NativeFunctionCall;
    static readonly CallExistsWithName: (functionName: string) => boolean;
    private _name;
    get name(): string;
    set name(value: string);
    private _numberOfParameters;
    get numberOfParameters(): number;
    set numberOfParameters(value: number);
    readonly Call: (parameters: Value<import("./Value/UnderlyingValueTypes").UnderlyingValueTypes>[]) => Value<import("./Value/UnderlyingValueTypes").UnderlyingValueTypes>;
    readonly CallBinaryListOperation: (parameters: RuntimeObject[]) => Value<import("./Value/UnderlyingValueTypes").UnderlyingValueTypes>;
    readonly CallListIncrementOperation: (listIntParams: RuntimeObject[]) => Value<import("./Value/UnderlyingValueTypes").UnderlyingValueTypes>;
    readonly CoerceValuesToSingleType: (parametersIn: Value<import("./Value/UnderlyingValueTypes").UnderlyingValueTypes>[]) => Value<import("./Value/UnderlyingValueTypes").UnderlyingValueTypes>[];
    constructor(name?: string, argCount?: number);
    readonly GeneratePrototype: (name: string, numberOfParameters: number) => void;
    static readonly Identity: <T extends any>(t: T) => T;
    static readonly GenerateNativeFunctionsIfNecessary: () => void;
    static readonly AddOpFuncForType: (valType: ValueType, op: any) => void;
    static readonly AddOpToNativeFunc: (name: string, args: number, valType: ValueType, op: any) => void;
    static readonly AddIntBinaryOp: (name: string, op: BinaryOp<number>) => void;
    static readonly AddIntUnaryOp: (name: string, op: UnaryOp<number>) => void;
    static readonly AddFloatBinaryOp: (name: string, op: BinaryOp<number>) => void;
    static readonly AddStringBinaryOp: (name: string, op: BinaryOp<string>) => void;
    static readonly AddListBinaryOp: (name: string, op: BinaryOp<RuntimeInkList>) => void;
    static readonly AddListUnaryOp: (name: string, op: UnaryOp<RuntimeInkList>) => void;
    static readonly AddFloatUnaryOp: (name: string, op: UnaryOp<number>) => void;
    readonly ToString: () => string;
}

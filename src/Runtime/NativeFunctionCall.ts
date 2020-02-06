import {
	RuntimeInkList,
} from './List/InkList';
import { RuntimeInkListItem } from './List/InkListItem';
import {
	IntValue,
} from './Value/IntValue';
import {
	RuntimeListDefinition,
} from './List/ListDefinition';
import {
	ListValue,
} from './Value/ListValue';
import {
	RuntimeObject,
} from './Object';
import {
	RuntimePath,
} from './Path';
import {
	StoryError,
} from './Story/StoryError';
import {
	Value,
} from './Value/Value';
import {
	ValueType,
} from './Value/ValueType';
import {
	Void,
} from './Void';

export type UnaryOp<T> = (val: T) => any;
export type BinaryOp<T> = (left: T, right: T) => any;

export class NativeFunctionCall extends RuntimeObject {
	private static _nativeFunctions: Record<string, NativeFunctionCall> = {};
	static get nativeFunctions(): Record<string, NativeFunctionCall> {
		return this._nativeFunctions;
	}

	private _prototype: NativeFunctionCall;
	get prototype(): NativeFunctionCall {
		return this._prototype;
	}

	private _isPrototype: boolean;
	get isPrototype(): boolean {
		return this._isPrototype;
	}

	// Operations for each data type, for a single operation (e.g. "+")
	private static _operationFuncs: Map<ValueType, UnaryOp<any> | BinaryOp<any>> = new Map();
	static get operationFuncs(): Map<ValueType, UnaryOp<any> | BinaryOp<any>> {
		return NativeFunctionCall._operationFuncs;
	}

	public static readonly Add = '+';
	public static readonly Subtract = '-';
	public static readonly Divide = '/';
	public static readonly Multiply = '*';
	public static readonly Mod = '%';

	// distinguish from '-' for subtraction
	public static readonly Negate = '_';

	public static readonly Equal = '==';
	public static readonly Greater = '>';
	public static readonly Less = '<';
	public static readonly GreaterThanOrEquals = '>=';
	public static readonly LessThanOrEquals = '<=';
	public static readonly NotEquals = '!=';
	public static readonly Not = '!';
	public static readonly And = '&&';
	public static readonly Or = '||';
	public static readonly Min = 'MIN';
	public static readonly Max = 'MAX';
	public static readonly Pow = 'POW';
	public static readonly Floor = 'FLOOR';
	public static readonly Ceiling = 'CEILING';
	public static readonly Int = 'INT';
	public static readonly Float = 'FLOAT';
	public static readonly Has = '?';
	public static readonly Hasnt = '!?';
	public static readonly Intersect = '^';
	public static readonly ListMin = 'LIST_MIN';
	public static readonly ListMax = 'LIST_MAX';
	public static readonly All = 'LIST_ALL';
	public static readonly Count = 'LIST_COUNT';
	public static readonly ValueOfList = 'LIST_VALUE';
	public static readonly Invert = 'LIST_INVERT';

	public static readonly CallWithName = (
		functionName: string,
	): NativeFunctionCall => (
		new NativeFunctionCall(functionName)
	);

	public static readonly CallExistsWithName = (
		functionName: string,
	): boolean => {
		NativeFunctionCall.GenerateNativeFunctionsIfNecessary();
		return functionName in NativeFunctionCall.nativeFunctions;
	};

	private _name: string;

	get name(): string { 
		return this._name;
	} 

	set name(value: string) {
		this._name = value;
		if (!this.isPrototype) {
			this._prototype = NativeFunctionCall.nativeFunctions[this._name];
		}
	}

	private _numberOfParameters: number;
	get numberOfParameters(): number { 
		if (this.prototype) {
				return this.prototype.numberOfParameters;
		}

		return this._numberOfParameters;
	}

	set numberOfParameters(value: number) {
		this._numberOfParameters = value;
	}

	public readonly Call = (parameters: Value[]): Value => {
		if (this.prototype) {
			return this.prototype.Call(parameters);
		} else if (this.numberOfParameters !== parameters.length) {
			throw new Error('Unexpected number of parameters.');
		}

		let hasList = false;
		for (const p of parameters) {
			if (p instanceof Void) {
				throw new StoryError(
					'Attempting to perform operation on a void value. Did you forget to \'return\' a value from a function you called here?',
				);
			} else if (p instanceof ListValue) {
				hasList = true;
			}
		}

		// Binary operations on lists are treated outside of the standard coerscion rules
		if (parameters.length === 2 && hasList) {
			return this.CallBinaryListOperation(parameters);
		}

		const coercedParams = this.CoerceValuesToSingleType(parameters);
		const [
			param1,
			param2,
		] = coercedParams;

		const coercedType: ValueType = coercedParams[0].valueType;
		const paramCount = coercedParams.length;

		if (paramCount == 2 || paramCount == 1) {
			const opForTypeObj = NativeFunctionCall.operationFuncs[coercedType];
			if (!opForTypeObj) {
				throw new StoryError(`Cannot perform operation '${this.name}' on ${coercedType}`);
			}

			if (paramCount === 2) {
				// Binary
				const resultVal = opForTypeObj(param1.value, param2.value);
				return Value.Create(resultVal);
			} else {
				// Unary
				const resultVal = opForTypeObj(param1.value);
				return Value.Create(resultVal);
			}  
		} else {
			throw new Error(
				`Unexpected number of parameters to NativeFunctionCall: ${coercedParams.length}`,
			);
		}

		return null;
	};

	public readonly CallBinaryListOperation = (
		parameters: RuntimeObject[],
	): Value => {
		// List-Int addition/subtraction returns a List (e.g. "alpha" + 1 = "beta")
		if ((this.name === '+' || this.name === '-') &&
			parameters[0] instanceof ListValue &&
			parameters[1] instanceof IntValue)
		{
			return this.CallListIncrementOperation(parameters);
		}

		const v1 = parameters [0] as Value;
		const v2 = parameters [1] as Value;

		if ((this.name === '&&' || this.name === '||') &&
			(v1.valueType !== ValueType.List || v2.valueType !== ValueType.List))
		{
			// And/or with any other type requires coerscion to bool (int)
			const op = NativeFunctionCall.operationFuncs[ValueType.Int] as BinaryOp<number>;
			const result = op(
				Number(v1.isTruthy),
				Number(v2.isTruthy),
			);

			return new IntValue(result);
		} else if (v1.valueType === ValueType.List &&
			v2.valueType === ValueType.List)
		{
			// Normal (list • list) operation
			return this.Call([ v1, v2 ]);
		}

		throw new StoryError(
			`Can not call use '${this.name}' operation on ${v1.valueType} and ${v2.valueType}`,
		);
	}

	public readonly CallListIncrementOperation = (
		listIntParams: RuntimeObject[],
	): Value => {
		const listVal = listIntParams[0] as ListValue;
		const intVal = listIntParams[1] as IntValue;

		const resultRawList = new RuntimeInkList();

		for (const key of listVal.value.Keys()) {
			const listItemValue = listVal.value.Get(key);

			// Find + or - operation
			const intOp = NativeFunctionCall.operationFuncs[ValueType.Int] as BinaryOp<number>;

			// Return value unknown until it's evaluated
			const targetInt = intOp(listItemValue, intVal.value) as number;

			// Find this item's origin (linear search should be ok, should be short haha)
			let itemOrigin: RuntimeListDefinition = null;
			for (const origin of listVal.value.origins) {
				if (origin.name === key.originName) {
					itemOrigin = origin;
					break;
				}
			}

			if (itemOrigin) {
				const incrementedItem: RuntimeInkListItem = itemOrigin.GetItemWithValue(targetInt);
				if (incrementedItem)
					resultRawList.Add (incrementedItem, targetInt);
			}
		}

		return new ListValue({ list: resultRawList });
	};

	public readonly CoerceValuesToSingleType = (
		parametersIn: Value[],
	): Value[] => {
		let valType: ValueType = ValueType.Int;
		let specialCaseList: ListValue = null;

		// Find out what the output type is.
		// "Higher level" types infect both so that binary operations
		// use the same type on both sides. e.g. binary operation of
		// int and float causes the int to be casted to a float.
		for (const val of parametersIn) {
			if (val.valueType > valType) {
				valType = val.valueType;
			}

			if (val.valueType == ValueType.List) {
				specialCaseList = val as ListValue;
			}
		}

		// Coerce to this chosen type
		const parametersOut: Value[] = [];

		// Special case: Coercing to Ints to Lists
		// We have to do it early when we have both parameters
		// to hand - so that we can make use of the List's origin
		if (valType === ValueType.List) {
			for (const val of parametersIn) {
				if (val.valueType === ValueType.List) {
					parametersOut.push(val);
				} else if (val.valueType === ValueType.Int) {
					const intVal = val.valueObject as number;
					const list = specialCaseList.value.originOfMaxItem;

					const item: RuntimeInkListItem = list.GetItemWithValue(intVal);
					if (item) {
						const castedValue = new ListValue({
							singleItem: [
								item,
								intVal,
							],
						});

						parametersOut.push(castedValue);
					} else {
						throw new StoryError(
							`Could not find List item with the value ${intVal} in ${list.name}`,
						);
					}
				} else {
					throw new StoryError(
						`Cannot mix Lists and ${val.valueType} values in this operation`,
					);
				}
			}
		} else {
			// Normal Coercing (with standard casting)
			for (const val of parametersIn) {
				const castedValue = val.Cast(valType);
				parametersOut.push(castedValue);
			}
		}

		return parametersOut;
	};

	constructor(name?: string, argCount: number = 0) {
		super();

		NativeFunctionCall.GenerateNativeFunctionsIfNecessary();

		if (name && typeof name === 'string') {
			this.name = name;
		}

		this._numberOfParameters = argCount;
	}

	// Only called internally to generate prototypes
	public readonly GeneratePrototype = (
		name: string,
		numberOfParameters: number,
	): void => {
		this._isPrototype = true;
		this.name = name;
		this.numberOfParameters = numberOfParameters;
	};

	// For defining operations that do nothing to the specific type
	// (but are still supported), such as floor/ceil on int and float
	// cast on float.
	public static readonly Identity = <T extends any>(t: T): T => (
		t
	);

	public static readonly GenerateNativeFunctionsIfNecessary = (): void => {
		if (!NativeFunctionCall.nativeFunctions) {
			NativeFunctionCall._nativeFunctions = {};
		}

		// Int operations
		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Add,
			(x, y) => x + y,
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Subtract,
			(x, y) => x - y,
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Multiply,
			(x, y) => x * y,
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Divide,
			(x, y) => x / y,
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Mod,
			(x, y) => x % y,
		); 

		NativeFunctionCall.AddIntUnaryOp(
			NativeFunctionCall.Negate,
			(x) => -x,
		); 

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Equal,
			(x, y) => Number(x === y),
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Greater,
			(x, y) => Number(x > y),
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Less,
			(x, y) => Number(x < y),
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.GreaterThanOrEquals,
			(x, y) => Number(x >= y),
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.LessThanOrEquals,
			(x, y) => Number(x <= y),
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.NotEquals,
			(x, y) => Number(x !== y),
		);

		NativeFunctionCall.AddIntUnaryOp(
			NativeFunctionCall.Not,
			(x) => Number(x === 0),
		); 

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.And,
			(x, y) => Number(x !== 0 && y !== 0),
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Or,
			(x, y) => Number(x !== 0 || y !== 0),
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Max,
			(x, y) => Math.max(x, y),
		);

		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Min,
			(x, y) => Math.min(x, y),
		);

		// Have to cast to float since you could do POW(2, -1)
		NativeFunctionCall.AddIntBinaryOp(
			NativeFunctionCall.Pow,
			(x, y) => Math.pow(x, y),
		);

		NativeFunctionCall.AddIntUnaryOp(
			NativeFunctionCall.Floor,
			NativeFunctionCall.Identity,
		);

		NativeFunctionCall.AddIntUnaryOp(
			NativeFunctionCall.Ceiling,
			NativeFunctionCall.Identity,
		);

		NativeFunctionCall.AddIntUnaryOp(
			NativeFunctionCall.Int,
			NativeFunctionCall.Identity,
		);

		NativeFunctionCall.AddIntUnaryOp(
			NativeFunctionCall.Float,
			(x) => Number(x),
		);

		// Float operations
		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Add,
			(x, y) => x + y,
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Subtract,
			(x, y) => x - y,
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Multiply,
			(x, y) => x * y,
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Divide,
			(x, y) => x / y,
		);

		// TODO: Is this the operation we want for floats?
		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Mod,
			(x, y) => x % y,
		);

		NativeFunctionCall.AddFloatUnaryOp(
			NativeFunctionCall.Negate,
			(x) => -x,
		); 

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Equal,
			(x, y) => Number(x === y),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Greater,
			(x, y) => Number(x > y),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Less,
			(x, y) => Number(x < y),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.GreaterThanOrEquals,
			(x, y) => Number(x >= y),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.LessThanOrEquals,
			(x, y) => Number(x <= y),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.NotEquals,
			(x, y) => Number(x !== y),
		);

		NativeFunctionCall.AddFloatUnaryOp(
			NativeFunctionCall.Not,
			(x) => Number(x === 0),
		); 

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.And,
			(x, y) => Number(x !== 0 && y !== 0),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Or,
			(x, y) => Number(x !== 0 || y !== 0.0),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Max,
			(x, y) => Math.max(x, y),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Min,
			(x, y) => Math.min(x, y),
		);

		NativeFunctionCall.AddFloatBinaryOp(
			NativeFunctionCall.Pow,
			(x, y) => Math.pow(x, y),
		);

		NativeFunctionCall.AddFloatUnaryOp(
			NativeFunctionCall.Floor,
			(x) => Math.floor(x),
		);

		NativeFunctionCall.AddFloatUnaryOp(
			NativeFunctionCall.Ceiling,
			(x) => Math.ceil(x),
		);

		NativeFunctionCall.AddFloatUnaryOp(
			NativeFunctionCall.Int,
			(x) => Math.floor(x),
		);

		NativeFunctionCall.AddFloatUnaryOp(
			NativeFunctionCall.Float,
			NativeFunctionCall.Identity,
		);

		// String operations
		// concat
		NativeFunctionCall.AddStringBinaryOp(
			NativeFunctionCall.Add,
			(x, y) => x + y,
		);

		NativeFunctionCall.AddStringBinaryOp(
			NativeFunctionCall.Equal,
			(x, y) => Number(x === y),
		);

		NativeFunctionCall.AddStringBinaryOp(
			NativeFunctionCall.NotEquals,
			(x, y) => Number(x !== y),
			);
		NativeFunctionCall.AddStringBinaryOp(
			NativeFunctionCall.Has,
			(x, y) => Number(x.includes(y)),
		);

		NativeFunctionCall.AddStringBinaryOp(
			NativeFunctionCall.Hasnt,
			(x, y) => Number(x.includes(y)),
		);

		// List operations
		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Add,
			(x, y) => x.Union(y),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Subtract,
			(x, y) => x.Without(y),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Has,
			(x, y) => Number(x.Contains(y)),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Hasnt,
			(x, y) => !Number(x.Contains(y)),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Intersect,
			(x, y) => x.Intersect(y),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Equal,
			(x, y) => Number(x.Equals(y)),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Greater,
			(x, y) => Number(x.GreaterThan(y)),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Less,
			(x, y) => Number(x.LessThan(y)),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.GreaterThanOrEquals,
			(x, y) => Number(x.GreaterThanOrEquals(y)),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.LessThanOrEquals,
			(x, y) => Number(x.LessThanOrEquals(y)),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.NotEquals,
			(x, y) => Number(!x.Equals(y)),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.And,
			(x, y) => Number(x.Size() > 0 && y.Size() > 0),
		);

		NativeFunctionCall.AddListBinaryOp(
			NativeFunctionCall.Or,
			(x, y) => Number(x.Size() > 0 || y.Size() > 0),
		);

		NativeFunctionCall.AddListUnaryOp(
			NativeFunctionCall.Not,
			(x) => Number(x.Size() === 0),
		);

		// Placeholders to ensure that these special case functions can exist,
		// since these functions are never actually run, and are special cased in Call
		NativeFunctionCall.AddListUnaryOp(
			NativeFunctionCall.Invert,
			(x) => x.inverse,
		);

		NativeFunctionCall.AddListUnaryOp(
			NativeFunctionCall.All,
			(x) => x.all,
		);

		NativeFunctionCall.AddListUnaryOp(
			NativeFunctionCall.ListMin,
			(x) => x.MinAsList(),
		);

		NativeFunctionCall.AddListUnaryOp(
			NativeFunctionCall.ListMax,
			(x) => x.MaxAsList(),
		);

		NativeFunctionCall.AddListUnaryOp(
			NativeFunctionCall.Count,
			(x) => x.Size(),
		);

		NativeFunctionCall.AddListUnaryOp(
			NativeFunctionCall.ValueOfList,
			(x) => x.maxItem[1],
		);

		// Special case: The only operations you can do on divert target values
		const divertTargetsEqual: BinaryOp<RuntimePath> = (
			d1: RuntimePath,
			d2: RuntimePath,
		) => (
			Number(d1.Equals(d2))
		);

		const divertTargetsNotEqual: BinaryOp<RuntimePath> = (
			d1: RuntimePath,
			d2: RuntimePath,
		) => (
			Number(!d1.Equals(d2))
		);

		NativeFunctionCall.AddOpToNativeFunc(
			NativeFunctionCall.Equal,
			2,
			ValueType.DivertTarget,
			divertTargetsEqual,
		);

		NativeFunctionCall.AddOpToNativeFunc(
			NativeFunctionCall.NotEquals,
			2,
			ValueType.DivertTarget,
			divertTargetsNotEqual,
		);
	};

	public static readonly AddOpFuncForType = (
		valType: ValueType,
		op: any,
	): void => {
		if (!NativeFunctionCall.operationFuncs) {
			NativeFunctionCall._operationFuncs.clear();
		}

		NativeFunctionCall.operationFuncs.set(valType, op);
	};

	public static readonly AddOpToNativeFunc = (
		name: string,
		args: number,
		valType: ValueType,
		op: any,
	): void => {
		let nativeFunc: NativeFunctionCall = NativeFunctionCall.nativeFunctions[name];
		if (!nativeFunc) {
			nativeFunc = new NativeFunctionCall(name, args);
			NativeFunctionCall.nativeFunctions[name] = nativeFunc;
		}

		NativeFunctionCall.AddOpFuncForType(valType, op);
	};

	public static readonly AddIntBinaryOp = (
		name: string,
		op: BinaryOp<number>,
	): void => {
		NativeFunctionCall.AddOpToNativeFunc(name, 2, ValueType.Int, op);
	};

	public static readonly AddIntUnaryOp = (
		name: string,
		op: UnaryOp<number>,
	): void => {
		NativeFunctionCall.AddOpToNativeFunc(name, 1, ValueType.Int, op);
	};

	public static readonly AddFloatBinaryOp = (
		name: string,
		op: BinaryOp<number>,
	) => {
		NativeFunctionCall.AddOpToNativeFunc(name, 2, ValueType.Float, op);
	};

	public static readonly AddStringBinaryOp =(
		name: string,
		op: BinaryOp<string>,
	) => {
		NativeFunctionCall.AddOpToNativeFunc(name, 2, ValueType.String, op);
	};

	public static readonly AddListBinaryOp = (
		name: string,
		op: BinaryOp<RuntimeInkList>,
	) => {
		NativeFunctionCall.AddOpToNativeFunc(name, 2, ValueType.List, op);
	};

	public static readonly AddListUnaryOp = (
		name: string,
		op: UnaryOp<RuntimeInkList>,
	) => {
		NativeFunctionCall.AddOpToNativeFunc(name, 1, ValueType.List, op);
	};

	public static readonly AddFloatUnaryOp = (
		name: string,
		op: UnaryOp<number>,
	): void => {
		NativeFunctionCall.AddOpToNativeFunc(name, 1, ValueType.Float, op);
	};

	public readonly ToString = (): string => (
		`Native '${this.name}'`
	);
}

import {
  Value,
} from './Value';
import {
  ValueType,
} from './ValueType';

// TODO: Think: Erm, I get that this contains a string, but should
// we really derive from Value<string>? That seems a bit misleading to me.
export class VariablePointerValue extends Value<string> {
  get variableName(): string {
    return this.value;
  }

  set variableName(value: string) {
    this.value = value;
  }

  get valueType(): ValueType {
    return ValueType.VariablePointer;
  }

  get isTruthy(): boolean {
    throw Error('Shouldn\'t be checking the truthiness of a variable pointer');
  }

  // Where the variable is located
  // -1 = default, unknown, yet to be determined
  // 0  = in global scope
  // 1+ = callstack element index + 1 (so that the first doesn't conflict with special global scope)
  public contextIndex: number;

  constructor(variableName: string, contextIndex: number = -1) { 
    super(variableName);

    this.contextIndex = contextIndex;
  }

  public readonly Cast = (newType: ValueType): VariablePointerValue => {
    if (newType === this.valueType) {
      return this;
    }

    throw new Error(`Bad cast exception: ${newType}`);
  };

  public readonly ToString = (): string => (
    `VariablePointerValue(${this.variableName})`
  );

  public readonly Copy = (): VariablePointerValue => (
    new VariablePointerValue(this.variableName, this.contextIndex)
  );
}

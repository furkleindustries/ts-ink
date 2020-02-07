import {
  FloatValue,
} from './FloatValue';
import {
  StringValue,
} from './StringValue';
import {
  Value,
} from './Value';
import {
  ValueType,
} from './ValueType';

export class IntValue extends Value<number> {
  get valueType(): ValueType {
    return ValueType.Int;
  }

  get value(): number {
    if (!this._value) {
      throw new Error();
    }

    return this._value;
  }

  get isTruthy() {
    return this.value !== 0;
  }

  constructor(intVal: number = 0) {
    super();

    this._value = intVal;
  }

  public readonly Cast = (newType: ValueType): Value => {
    if (newType === this.valueType) {
      return this;
    } else if (newType === ValueType.Float) {
      return new FloatValue(Number(this.value));
    } else if (newType == ValueType.String) {
      return new StringValue(String(this.value));
    }

    throw new Error(`Bad cast exception: ${newType}`);
  };
}

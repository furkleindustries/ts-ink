import {
  IntValue,
} from './IntValue';
import {
  StringValue,
} from './StringValue';
import {
  Value,
} from './Value';
import {
  ValueType,
} from './ValueType';

export class FloatValue extends Value<number> {
  get valueType(): ValueType {
    return ValueType.Float;
  }

  get value(): number {
    if (!this._value) {
      throw new Error();
    }

    return this._value;
  }

  get isTruthy(): boolean {
    return this.value !== 0;
  }

  constructor(val: number = 0) {
    super();

    this._value = val;
  }

  public readonly Cast = (newType: ValueType): Value => {
    if (newType === this.valueType) {
      return this;
    } else if (newType === ValueType.Int) {
      return new IntValue(this.value);
    } else if (newType === ValueType.String) {
      const val = typeof this.value === 'object' && 'ToString' in this.value ?
        (this.value as any).ToString() :
        String(this.value);

      return new StringValue(val);
    }

    throw new Error(`Bad cast exception: ${newType}`);
  };
}

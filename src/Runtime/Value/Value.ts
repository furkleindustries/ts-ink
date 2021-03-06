import {
  DivertTargetValue,
} from './DivertTargetValue';
import {
  FloatValue,
} from './FloatValue';
import {
  RuntimeInkList,
} from '../List/InkList';
import {
  IntValue,
} from './IntValue';
import {
  ListValue,
} from './ListValue';
import {
  RuntimePath,
} from '../Path';
import {
  RuntimeObject,
} from '../Object';
import {
  StringValue,
} from './StringValue';
import {
  UnderlyingValueTypes,
} from './UnderlyingValueTypes';
import {
  ValueType,
} from './ValueType';

export abstract class Value<T extends UnderlyingValueTypes = UnderlyingValueTypes> extends RuntimeObject {
  public abstract valueType: ValueType;
  public abstract isTruthy: boolean;

  public abstract readonly Cast: (newType: ValueType) => Value | null;

  public static readonly Create = (val: any): Value | null => {
    if (val === null || val === undefined) {
      return null;
    }

    let value: any = val;
    if (typeof value === 'number' && !Number.isNaN(value)) {
      if (value % 1 === 0) {
        return new IntValue(value);
      }

      return new FloatValue(value);
    } else if (typeof value === 'boolean') {;
      // Implicitly convert bools into ints
      return new IntValue(Number(value));
    } else if (typeof value === 'string') {
      return new StringValue(value);
    } else if (value instanceof RuntimePath) {
      return new DivertTargetValue(value);
    } else if (value instanceof RuntimeInkList) {
      return new ListValue({ list: value });
    }

    return null;
  };

  public static readonly RetainListOriginsForAssignment = (
    oldValue: RuntimeObject,
    newValue: RuntimeObject,
  ): void => {
    const oldList = oldValue as ListValue;
    const newList = newValue as ListValue;

    // When assigning the emtpy list, try to retain any initial origin names
    if (oldList &&
      oldList.value &&
      newList &&
      newList.value &&
      !newList.value.Size())
    {
      newList.value.SetInitialOriginNames(oldList.value.originNames);
    }
  };

  public readonly Copy = (): Value | null => {
    if (!this.value) {
      return null;
    }

    return Value.Create(this.value);
  };

  public readonly BadCastException = (targetType: ValueType): Error => (
    new Error(`Can't cast ${this.value} from ${this.valueType} to ${targetType}`)
  );
  
  protected _value: T | null = null;
  get value(): T | null {
    if (!this._value) {
      throw new Error();
    }

    return this._value;
  }

  set value(value: T | null) {
    this._value = value;
  }

  constructor() {
    super();
  }

  public readonly ToString = (): string => (
    (this.value && 'ToString' in this.value) ?
      (this.value as any).ToString() :
      String(this.value)
  );
}

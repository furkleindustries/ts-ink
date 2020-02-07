import {
  FloatValue,
} from './FloatValue';
import {
  IntValue,
} from './IntValue';
import {
  Value,
} from './Value';
import {
  ValueType,
} from './ValueType';

export class StringValue extends Value<string> {
  get valueType(): ValueType {
    return ValueType.String;
  }

  get value(): string {
    if (!this.value) {
      throw new Error();
    }

    return this._value as string;
  }

  get isTruthy(): boolean {
    return this.value.length > 0;
  }

  public isNewline: boolean;
  public isInlineWhitespace: boolean;
  get isNonWhitespace(): boolean {
    return !this.isNewline && !this.isInlineWhitespace;
  }

  constructor(str: string = '') {
    super();

    this._value = str;

    // Classify whitespace status
    this.isNewline = this.value === "\n";
    this.isInlineWhitespace = true;
    for (const c of this.value) {
      if (c !== ' ' && c !== '\t') {
        this.isInlineWhitespace = false;
        break;
      }
    }
  }

  public Cast = (newType: ValueType): Value | null => {
    if (newType === this.valueType) {
      return this;
    }

    if (newType === ValueType.Int) {
      const parsedNum = Number(this.value);
      if (!Number.isNaN(parsedNum)) {
        return new IntValue(parsedNum);
      }

      return null;
    }

    if (newType === ValueType.Float) {
      const parsedFloat = Number(this.value);
      if (!Number.isNaN(parsedFloat)) {
        return new FloatValue(parsedFloat);
      }

      return null;
    }

    throw new Error(`Bad cast exception: ${newType}`);
  };
}

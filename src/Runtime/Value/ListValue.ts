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
  ListKeyValuePair,
} from '../List/ListKeyValuePair';
import {
  StringValue,
} from './StringValue';
import {
  Value,
} from './Value';
import {
  ValueType,
} from './ValueType';

export class ListValue extends Value<RuntimeInkList> {
  get valueType(): ValueType {
    return ValueType.List;
  }

  get value(): RuntimeInkList {
    if (!this._value) {
      throw new Error();
    }

    return this._value;
  }

  // Truthy if it is non-empty
  get isTruthy(): boolean {
    return this.value.Size() > 0;
  }
          
  public readonly Cast = (newType: ValueType): Value => {
    if (newType === ValueType.Int) {
      const max = this.value.maxItem;
      if (max[0] === null) {
        return new IntValue(0);
      }

      return new IntValue(max[1]);
    } else if (newType === ValueType.Float) {
      const max = this.value.maxItem;
      if (max[0] === null) {
        return new FloatValue(0);
      }

      return new FloatValue(Number(max[1]));
    } else if (newType === ValueType.String) {
      const max = this.value.maxItem;
      if (max[0] === null) {
        return new StringValue('');
      }
 
      return new StringValue(max[0].ToString());
    }

    if (newType === this.valueType) {
      return this;
    }

    throw new Error(`Bad cast exception: ${newType}`);
  };

  constructor({
    list,
    singleItem,
    singleValue,
  }: {
    list?: RuntimeInkList,
    singleItem?: ListKeyValuePair,
    singleValue?: number,
  } = {}) {
    super();

    if (list) {
      this._value = new RuntimeInkList({ otherList: list });
    } if (singleItem && singleValue) {
      this._value = new RuntimeInkList({ singleElement: singleItem });
    } else {
      this._value = new RuntimeInkList();
    }
  }
}

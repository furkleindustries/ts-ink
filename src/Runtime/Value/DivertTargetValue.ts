import {
  RuntimePath,
} from '../Path';
import {
  Value,
} from './Value';
import {
  ValueType,
} from './ValueType';

export class DivertTargetValue extends Value<RuntimePath> {
  get targetPath(): RuntimePath {
    return this.value;
  }

  set targetPath(value: RuntimePath) {
    this.value = value;
  }

  get valueType(): ValueType {
    return ValueType.DivertTarget;
  }

  get isTruthy(): boolean {
    throw new Error('Shouldn\'t be checking the truthiness of a divert target');
  }
   
  constructor(targetPath: RuntimePath = null) {
    super(targetPath)
  }

  public readonly Cast = (newType: ValueType): DivertTargetValue => {
    if (newType === this.valueType) {
      return this;
    }
    
    throw new Error(`Bad cast exception: ${newType}`);
  };

  public readonly ToString = (): string => (
    `DivertTargetValue(${this.targetPath})`
  );
}

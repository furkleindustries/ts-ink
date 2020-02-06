import {
  Object,
} from './Object';
import {
  RuntimeObject,
} from '../../../Runtime/Object';

export class Wrap<T extends RuntimeObject> extends Object {
  constructor(private _objToWrap: T) {
    super();
  }

  public readonly GenerateRuntimeObject = (): RuntimeObject => (
    this._objToWrap
  );
}

import {
  RuntimeObject,
} from './Object';

export class RuntimeGlue extends RuntimeObject {
  public readonly ToString = (): string => (
    'Glue'
  );
}

import {
  RuntimeContainer,
} from '../../../Runtime/Container';
import {
  Object,
} from './Object';

export interface IWeavePoint extends Object {
  readonly content: Object[];
  readonly indentationDepth: number;
  readonly name: string;
  readonly runtimeContainer: RuntimeContainer;
}

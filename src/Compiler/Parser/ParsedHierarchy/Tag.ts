import {
  RuntimeTag,
} from '../../../Runtime/Tag';
import {
  Wrap,
} from './Wrap';

export class Tag extends Wrap<RuntimeTag> {
  constructor(tag: RuntimeTag) {
    super(tag)
  }
}

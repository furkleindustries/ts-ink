import {
  RuntimeGlue,
} from '../../../Runtime/Glue';
import {
  Wrap,
} from './Wrap';

export class Glue extends Wrap<RuntimeGlue> {
  constructor(glue: RuntimeGlue) {
    super(glue);
  }
}

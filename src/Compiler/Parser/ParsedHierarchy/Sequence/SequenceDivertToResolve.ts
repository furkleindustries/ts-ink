import {
  RuntimeDivert,
} from '../../../../Runtime/Divert/Divert';
import {
  RuntimeObject,
} from '../../../../Runtime/Object';

export class SequenceDivertToResolve {
  constructor(
    public divert: RuntimeDivert,
    public targetContent: RuntimeObject,
  )
  {}
}

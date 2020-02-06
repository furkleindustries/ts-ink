import {
  RuntimeDivert,
} from '../../../../Runtime/Divert/Divert';
import {
  RuntimeObject,
} from '../../../../Runtime/Object';

export class GatherPointToResolve {
  constructor(
    public divert: RuntimeDivert,
    public targetRuntimeObj: RuntimeObject,
  )
  {}
}

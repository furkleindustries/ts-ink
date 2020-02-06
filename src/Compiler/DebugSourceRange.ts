import {
  DebugMetadata,
} from '../DebugMetadata'

export class DebugSourceRange {
  constructor(
    public readonly length: number,
    public readonly debugMetadata: DebugMetadata,
    public text: string,
  )
  {}
}

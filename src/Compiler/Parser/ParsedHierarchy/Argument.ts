export class Argument {
  constructor(
    public name: string = null,
    public isByReference: boolean = null,
    public isDivertTarget: boolean = null,
  )
  {}
}

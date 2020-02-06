export class StringParserElement {
  public static _uniqueIdCounter: number;

  public characterIndex: number;
  public lineIndex: number;
  public reportedErrorInScope: boolean;
  public uniqueId: number;
  public customFlags: number;

  public readonly CopyFrom = (fromElement: StringParserElement): void => {
    StringParserElement._uniqueIdCounter++;
    this.uniqueId = StringParserElement._uniqueIdCounter;
    this.characterIndex = fromElement.characterIndex;
    this.lineIndex = fromElement.lineIndex;
    this.customFlags = fromElement.customFlags;
    this.reportedErrorInScope = false;
  }

  // Squash is used when succeeding from a rule,
  // so only the state information we wanted to carry forward is
  // retained. e.g. characterIndex and lineIndex are global,
  // however uniqueId is specific to the individual rule,
  // and likewise, custom flags are designed for the temporary
  // state of the individual rule too.
  public readonly SquashFrom = (fromElement: StringParserElement): void => {
    this.characterIndex = fromElement.characterIndex;
    this.lineIndex = fromElement.lineIndex;
    this.reportedErrorInScope = fromElement.reportedErrorInScope;
  };
}

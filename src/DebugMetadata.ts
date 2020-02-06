export class DebugMetadata {
  public startLineNumber = 0;
  public endLineNumber = 0;
  public fileName: string = null;
  public sourceName: string = null;

  public readonly ToString = () => {
    if (this.fileName !== null) {
      return `line ${this.startLineNumber} of ${this.fileName}`;
    }

    return `line ${this.startLineNumber}`;
  };
}

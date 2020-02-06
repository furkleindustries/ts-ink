export class DebugMetadata {
    constructor() {
        this.startLineNumber = 0;
        this.endLineNumber = 0;
        this.fileName = null;
        this.sourceName = null;
        this.ToString = () => {
            if (this.fileName !== null) {
                return `line ${this.startLineNumber} of ${this.fileName}`;
            }
            return `line ${this.startLineNumber}`;
        };
    }
}
//# sourceMappingURL=DebugMetadata.js.map
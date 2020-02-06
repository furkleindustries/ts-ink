export class StringParserElement {
    constructor() {
        this.CopyFrom = (fromElement) => {
            StringParserElement._uniqueIdCounter++;
            this.uniqueId = StringParserElement._uniqueIdCounter;
            this.characterIndex = fromElement.characterIndex;
            this.lineIndex = fromElement.lineIndex;
            this.customFlags = fromElement.customFlags;
            this.reportedErrorInScope = false;
        };
        // Squash is used when succeeding from a rule,
        // so only the state information we wanted to carry forward is
        // retained. e.g. characterIndex and lineIndex are global,
        // however uniqueId is specific to the individual rule,
        // and likewise, custom flags are designed for the temporary
        // state of the individual rule too.
        this.SquashFrom = (fromElement) => {
            this.characterIndex = fromElement.characterIndex;
            this.lineIndex = fromElement.lineIndex;
            this.reportedErrorInScope = fromElement.reportedErrorInScope;
        };
    }
}
//# sourceMappingURL=StringParserElement.js.map
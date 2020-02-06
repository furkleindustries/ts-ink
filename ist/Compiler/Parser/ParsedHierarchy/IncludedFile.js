import { Object, } from './Object';
export class IncludedFile extends Object {
    constructor(includedStory) {
        super();
        this.includedStory = includedStory;
        this.GenerateRuntimeObject = () => {
            // Left to the main story to process
            return null;
        };
    }
}
//# sourceMappingURL=IncludedFile.js.map
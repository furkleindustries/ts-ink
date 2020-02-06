export class CompilerOptions {
    constructor(sourceFilename = null, pluginNames = [], countAllVisits = false, errorHandler = null, fileHandler = null) {
        this.sourceFilename = sourceFilename;
        this.pluginNames = pluginNames;
        this.countAllVisits = countAllVisits;
        this.errorHandler = errorHandler;
        this.fileHandler = fileHandler;
    }
}
//# sourceMappingURL=CompilerOptions.js.map
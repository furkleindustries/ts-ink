import { CompilerOptions, } from './CompilerOptions';
import { DebugSourceRange, } from './DebugSourceRange';
import { ErrorType, } from './Parser/ErrorType';
import { InkParser, } from './Parser/InkParser';
import { PluginManager, } from '../Plugins/PluginManager';
export class Compiler {
    constructor(inkSource, options = null) {
        this._errors = [];
        this._warnings = [];
        this._authorMessages = [];
        this._debugSourceRanges = [];
        this.Compile = () => {
            this._parser = new InkParser(this.inputString, this.options.sourceFilename, this.OnError, null, this.options.fileHandler);
            this._parsedStory = this.parser.Parse();
            if (this.pluginManager !== null) {
                this.pluginManager.PostParse(this.parsedStory);
            }
            if (this.parsedStory !== null && this.errors.length === 0) {
                this.parsedStory.countAllVisits = this.options.countAllVisits;
                this._runtimeStory = this.parsedStory.ExportRuntime(this.OnError);
                if (this._pluginManager !== null) {
                    this.pluginManager.PostExport(this.parsedStory, this.runtimeStory);
                }
            }
            else {
                this._runtimeStory = null;
            }
            return this.runtimeStory;
        };
        this.RetrieveDebugSourceForLatestContent = () => {
            for (const outputObj of this.runtimeStory.state.outputStream) {
                const textContent = outputObj;
                if (textContent !== null) {
                    const range = new DebugSourceRange(textContent.value.length, textContent.debugMetadata, textContent.value);
                    this.debugSourceRanges.push(range);
                }
            }
        };
        this.DebugMetadataForContentAtOffset = (offset) => {
            let currOffset = 0;
            let lastValidMetadata = null;
            for (const range of this.debugSourceRanges) {
                if (range.debugMetadata !== null) {
                    lastValidMetadata = range.debugMetadata;
                }
                if (offset >= currOffset && offset < currOffset + range.length) {
                    return lastValidMetadata;
                }
                currOffset += range.length;
            }
            return null;
        };
        this.OnError = (message, errorType) => {
            switch (errorType) {
                case ErrorType.Author:
                    this._authorMessages.push(message);
                    break;
                case ErrorType.Warning:
                    this._warnings.push(message);
                    break;
                case ErrorType.Error:
                    this._errors.push(message);
                    break;
            }
            if (this.options.errorHandler !== null) {
                this.options.errorHandler(message, errorType);
            }
        };
        this._inputString = inkSource;
        this._options = options || new CompilerOptions();
        if (this.options.pluginNames !== null) {
            this._pluginManager = new PluginManager(this.options.pluginNames);
        }
    }
    get errors() {
        return this._errors;
    }
    get warnings() {
        return this._warnings;
    }
    get authorMessages() {
        return this._authorMessages;
    }
    get inputString() {
        return this._inputString;
    }
    get options() {
        return this._options;
    }
    get pluginManager() {
        return this._pluginManager;
    }
    get parsedStory() {
        return this._parsedStory;
    }
    get runtimeStory() {
        return this._runtimeStory;
    }
    get parser() {
        return this._parser;
    }
    get debugSourceRanges() {
        return this._debugSourceRanges;
    }
}
//# sourceMappingURL=Compiler.js.map
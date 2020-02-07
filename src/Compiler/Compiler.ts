import {
  CompilerOptions,
} from './CompilerOptions';
import {
  DebugMetadata,
} from '../DebugMetadata';
import {
  DebugSourceRange,
} from './DebugSourceRange';
import {
  ErrorType,
} from './Parser/ErrorType';
import {
  InkParser,
} from './Parser/InkParser';
import {
  PluginManager,
} from '../Plugins/PluginManager';
import {
  RuntimeStory,
} from '../Runtime/Story/Story';
import {
  StringValue,
} from '../Runtime/Value/StringValue';
import {
  Story,
} from './Parser/ParsedHierarchy/Story';

export class Compiler {
  private _errors: string[] = [];
  get errors(): string[] {
    return this._errors;
  }

  private _warnings: string[] = [];
  get warnings(): string[] {
    return this._warnings;
  }

  private _authorMessages: string[] = [];
  get authorMessages(): string[] {
    return this._authorMessages;
  }

  private _inputString: string;
  get inputString(): string {
    return this._inputString;
  }

  private _options: CompilerOptions;
  get options(): CompilerOptions {
    return this._options;
  }

  private _pluginManager: PluginManager | null = null;
  get pluginManager() {
    return this._pluginManager;
  }

  private _parsedStory: Story | null = null;
  get parsedStory(): Story {
    if (!this._parsedStory) {
      throw new Error();
    }

    return this._parsedStory; 
  }

  private _runtimeStory: RuntimeStory | null = null;
  get runtimeStory(): RuntimeStory {
    if (!this._runtimeStory) {
      throw new Error();
    }

    return this._runtimeStory;
  }

  private _parser: InkParser | null = null;
  get parser(): InkParser {
    if (!this._parser) {
      throw new Error();
    }

    return this._parser;
  }

  private _debugSourceRanges: DebugSourceRange[] = [];
  get debugSourceRanges(): DebugSourceRange[] {
    return this._debugSourceRanges;
  }

  constructor(inkSource: string, options: CompilerOptions | null = null) {
    this._inputString = inkSource;
    this._options = options || new CompilerOptions();
    if (this.options.pluginNames !== null) {
      this._pluginManager = new PluginManager(this.options.pluginNames);
    }
  }

  public readonly Compile = (): RuntimeStory => {
    this._parser = new InkParser(
      this.inputString,
      this.options.sourceFilename || '',
      this.OnError,
      null,
      this.options.fileHandler,
    );

    this._parsedStory = this.parser.Parse();

    if (this.pluginManager !== null) {
      this.pluginManager.PostParse(this.parsedStory);
    }

    if (this.errors.length === 0) {
      this.parsedStory.countAllVisits = this.options.countAllVisits;
      this._runtimeStory = this.parsedStory.ExportRuntime(this.OnError);

      if (this.pluginManager) {
        this.pluginManager.PostExport(this.parsedStory, this.runtimeStory);
      }
    } else {
      this._runtimeStory = null;
    }

    return this.runtimeStory;
  }

  public readonly RetrieveDebugSourceForLatestContent = (): void => {
    for (const outputObj of this.runtimeStory.state.outputStream) {
      const textContent = outputObj as StringValue;
      if (textContent !== null) {
        const range = new DebugSourceRange(
          textContent.value.length,
          textContent.debugMetadata,
          textContent.value,
        );

        this.debugSourceRanges.push(range);
      }
    }
  };

  public readonly DebugMetadataForContentAtOffset = (
    offset: number,
  ): DebugMetadata | null => {
    let currOffset = 0;

    let lastValidMetadata: DebugMetadata | null = null;
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

  public readonly OnError = (message: string, errorType: ErrorType) => {
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
}

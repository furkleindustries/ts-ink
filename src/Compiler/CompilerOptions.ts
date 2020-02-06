import {
  ErrorHandler,
} from '../ErrorHandler';
import {
  IFileHandler,
} from '../IFileHandler';

export class CompilerOptions {
  constructor(
    public readonly sourceFilename: string = null,
    public readonly pluginNames: string[] = [],
    public readonly countAllVisits: boolean = false,
    public readonly errorHandler: ErrorHandler = null,
    public readonly fileHandler: IFileHandler = null,
  )
  {}
}

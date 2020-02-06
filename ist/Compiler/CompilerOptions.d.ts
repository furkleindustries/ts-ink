import { ErrorHandler } from '../ErrorHandler';
import { IFileHandler } from '../IFileHandler';
export declare class CompilerOptions {
    readonly sourceFilename: string;
    readonly pluginNames: string[];
    readonly countAllVisits: boolean;
    readonly errorHandler: ErrorHandler;
    readonly fileHandler: IFileHandler;
    constructor(sourceFilename?: string, pluginNames?: string[], countAllVisits?: boolean, errorHandler?: ErrorHandler, fileHandler?: IFileHandler);
}

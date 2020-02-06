import { INamedContent } from '../../../../INamedContent';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
export declare class ExternalDeclaration extends Object implements INamedContent {
    readonly name: string;
    readonly argumentNames: string[];
    constructor(name: string, argumentNames: string[]);
    readonly GenerateRuntimeObject: () => RuntimeObject;
}

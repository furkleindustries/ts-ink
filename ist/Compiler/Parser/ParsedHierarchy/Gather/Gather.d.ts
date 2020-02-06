import { RuntimeContainer } from '../../../../Runtime/Container';
import { INamedContent } from '../../../../INamedContent';
import { IWeavePoint } from '../IWeavePoint';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
import { Story } from '../Story';
export declare class Gather extends Object implements INamedContent, IWeavePoint {
    readonly name: string;
    readonly indentationDepth: number;
    get runtimeContainer(): RuntimeContainer;
    constructor(name: string, indentationDepth: number);
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly ResolveReferences: (context: Story) => void;
}

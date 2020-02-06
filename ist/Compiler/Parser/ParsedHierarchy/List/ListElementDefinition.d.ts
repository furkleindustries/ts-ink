import { ListDefinition } from './ListDefinition';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
import { Story } from '../Story';
export declare class ListElementDefinition extends Object {
    readonly name: string;
    readonly inInitialList: boolean;
    readonly explicitValue: number;
    seriesValue: number;
    get parent(): ListDefinition;
    get fullName(): string;
    get typeName(): string;
    constructor(name: string, inInitialList: boolean, explicitValue?: number);
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly ResolveReferences: (context: Story) => void;
}

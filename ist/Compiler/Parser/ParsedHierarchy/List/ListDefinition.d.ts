import { RuntimeListDefinition } from '../../../../Runtime/List/ListDefinition';
import { ListElementDefinition } from './ListElementDefinition';
import { ListValue } from '../../../../Runtime/Value/ListValue';
import { Object } from '../Object';
import { Story } from '../Story';
import { VariableAssignment } from '../Variable/VariableAssignment';
export declare class ListDefinition extends Object {
    itemDefinitions: ListElementDefinition[];
    name: string;
    variableAssignment: VariableAssignment;
    get typeName(): string;
    private _elementsByName;
    get runtimeListDefinition(): RuntimeListDefinition;
    readonly ItemNamed: (itemName: string) => ListElementDefinition;
    constructor(itemDefinitions: ListElementDefinition[]);
    readonly GenerateRuntimeObject: () => ListValue;
    readonly ResolveReferences: (context: Story) => void;
}

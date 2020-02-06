import { RuntimeListDefinition } from './List/ListDefinition';
import { ListValue } from './Value/ListValue';
export declare class ListDefinitionsOrigin {
    private _lists;
    get lists(): RuntimeListDefinition[];
    private _allUnambiguousListValueCache;
    get allUnambiguousListValueCache(): Record<string, ListValue>;
    constructor(lists: RuntimeListDefinition[]);
    readonly GetListDefinition: (name: string) => RuntimeListDefinition | null;
    readonly FindSingleItemListWithName: (name: string) => ListValue;
}

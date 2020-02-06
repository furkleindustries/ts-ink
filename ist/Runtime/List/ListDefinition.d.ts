import { RuntimeInkListItem } from './InkListItem';
export declare class RuntimeListDefinition {
    private readonly _name;
    private readonly _items;
    private _itemNameToValues;
    get name(): string;
    get items(): Map<RuntimeInkListItem, number>;
    readonly ValueForItem: (item: RuntimeInkListItem) => number;
    ContainsItem: (item: RuntimeInkListItem) => boolean;
    readonly ContainsItemWithName: (itemName: string) => boolean;
    readonly GetItemWithName: (itemName: string) => number;
    readonly GetItemWithValue: (value: number) => RuntimeInkListItem;
    constructor(_name: any, _items?: Map<any, any>);
}

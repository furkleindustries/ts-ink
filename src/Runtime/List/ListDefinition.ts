import {
  RuntimeInkListItem,
} from './InkListItem';

export class RuntimeListDefinition {
  // The main representation should be simple item names rather than a RawListItem,
  // since we mainly want to access items based on their simple name, since that's
  // how they'll be most commonly requested from ink.
  private _itemNameToValues: Map<string, number>;

  get name(): string {
    return this._name;
  }

  get items(): Map<RuntimeInkListItem, number> {
    if (this._items === null) {
      this._items.clear();
      for (const itemName of this._itemNameToValues.keys()) {
        const item = new RuntimeInkListItem(this.name, itemName);
        this._items.set(item, this._itemNameToValues.get(itemName));
      }
    }

    return this._items;
  }

  public readonly ValueForItem = (item: RuntimeInkListItem): number => {
    let intVal = this._itemNameToValues.get(item.itemName);
    if (typeof intVal === 'number') {
      return intVal;
    }

    return 0;
  };

  public ContainsItem = (item: RuntimeInkListItem): boolean => (
    item.originName === name ? 
      this._itemNameToValues.has(item.itemName) :
      false
  );

  public readonly ContainsItemWithName = (itemName: string): boolean => (
    this._itemNameToValues.has(itemName)
  );

  public readonly GetItemWithName = (itemName: string): number => (
    this._itemNameToValues.get(itemName) || null
  );

  public readonly GetItemWithValue = (value: number): RuntimeInkListItem => {
    for (const item of this.items) {
      if (item[1] === value) {
        return item[0];
      }
    }

    return null;
  };

  constructor(
    private readonly _name,
    private readonly _items = new Map(),
  )
  {}
}

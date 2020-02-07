import {
  RuntimeInkListItem,
} from './InkListItem';

export class RuntimeListDefinition {
  // The main representation should be simple item names rather than a RawListItem,
  // since we mainly want to access items based on their simple name, since that's
  // how they'll be most commonly requested from ink.
  private _itemNameToValues: Map<string, number> = new Map();
  get itemNameToValues() {
    return this._itemNameToValues;
  }

  get name(): string {
    return this._name;
  }

  get items(): Map<RuntimeInkListItem, number> {
    this._items.clear();
    for (const [ key, value ] of this.itemNameToValues.entries()) {
      const item = new RuntimeInkListItem(this.name, key);
      this._items.set(item, value);
    }

    return this._items;
  }

  public readonly ValueForItem = (item: RuntimeInkListItem): number => {
    if (!item.itemName) {
      return 0;
    }

    let intVal = this._itemNameToValues.get(item.itemName);
    if (typeof intVal === 'number') {
      return intVal;
    }

    return 0;
  };

  public ContainsItem = (item: RuntimeInkListItem): boolean => (
    item.itemName && item.originName === name ? 
      this._itemNameToValues.has(item.itemName) :
      false
  );

  public readonly ContainsItemWithName = (itemName: string): boolean => (
    this._itemNameToValues.has(itemName)
  );

  public readonly GetItemWithName = (itemName: string): number => {
    if (!this.itemNameToValues.has(itemName)) {
      throw new Error();
    }

    return this.itemNameToValues.get(itemName)!;
  };

  public readonly GetItemWithValue = (value: number): RuntimeInkListItem | null => {
    for (const item of this.items) {
      if (item[1] === value) {
        return item[0];
      }
    }

    return null;
  };

  constructor(
    private readonly _name: string,
    private readonly _items = new Map(),
  )
  {}
}

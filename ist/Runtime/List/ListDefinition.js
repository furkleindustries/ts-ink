import { RuntimeInkListItem, } from './InkListItem';
export class RuntimeListDefinition {
    constructor(_name, _items = new Map()) {
        this._name = _name;
        this._items = _items;
        this.ValueForItem = (item) => {
            let intVal = this._itemNameToValues.get(item.itemName);
            if (typeof intVal === 'number') {
                return intVal;
            }
            return 0;
        };
        this.ContainsItem = (item) => (item.originName === name ?
            this._itemNameToValues.has(item.itemName) :
            false);
        this.ContainsItemWithName = (itemName) => (this._itemNameToValues.has(itemName));
        this.GetItemWithName = (itemName) => (this._itemNameToValues.get(itemName) || null);
        this.GetItemWithValue = (value) => {
            for (const item of this.items) {
                if (item[1] === value) {
                    return item[0];
                }
            }
            return null;
        };
    }
    get name() {
        return this._name;
    }
    get items() {
        if (this._items === null) {
            this._items.clear();
            for (const itemName of this._itemNameToValues.keys()) {
                const item = new RuntimeInkListItem(this.name, itemName);
                this._items.set(item, this._itemNameToValues.get(itemName));
            }
        }
        return this._items;
    }
}
//# sourceMappingURL=ListDefinition.js.map
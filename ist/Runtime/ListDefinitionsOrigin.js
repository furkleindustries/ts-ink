import { ListValue, } from './Value/ListValue';
export class ListDefinitionsOrigin {
    constructor(lists) {
        this.GetListDefinition = (name) => (this.lists.find((def) => def.name === name) || null);
        this.FindSingleItemListWithName = (name) => (this.allUnambiguousListValueCache[name] || null);
        this._lists = {};
        this._allUnambiguousListValueCache = {};
        for (const list of lists) {
            this.lists[list.name] = list;
            for (const key of list.items.keys()) {
                const listValue = new ListValue({
                    singleItem: [
                        key,
                        list.items.get(key),
                    ]
                });
                // May be ambiguous, but compiler should've caught that,
                // so we may be doing some replacement here, but that's okay.
                this._allUnambiguousListValueCache[key.itemName] = listValue;
                this._allUnambiguousListValueCache[key.fullName] = listValue;
            }
        }
    }
    get lists() {
        const listOfLists = [];
        for (const key in this._lists) {
            listOfLists.push(this._lists[key]);
        }
        return listOfLists;
    }
    get allUnambiguousListValueCache() {
        return this._allUnambiguousListValueCache;
    }
}
//# sourceMappingURL=ListDefinitionsOrigin.js.map
import {
  RuntimeListDefinition,
} from './List/ListDefinition';
import {
  ListValue,
} from './Value/ListValue';

export class ListDefinitionsOrigin {
  private _lists: Map<string, RuntimeListDefinition> = new Map();  
  get lists() {
    return this._lists;
  }

  private _allUnambiguousListValueCache: Map<string, ListValue> = new Map();
  get allUnambiguousListValueCache() {
    return this._allUnambiguousListValueCache;
  }


  constructor(
    lists: RuntimeListDefinition[],
  ) {
    for (const list of lists) {
      this.lists.set(list.name, list);

      for (const [ key, value ] of list.items.entries()) {
        if (!key.itemName || !key.fullName || !value) {
          continue;
        }

        const listValue = new ListValue({
          singleItem: [
            key,
            value,
          ],
        });

        // May be ambiguous, but compiler should've caught that,
        // so we may be doing some replacement here, but that's okay.
        this.allUnambiguousListValueCache.set(key.itemName, listValue);
        this.allUnambiguousListValueCache.set(key.fullName, listValue);
      }
    }
  }

  public readonly GetListDefinition = (name: string) => (
    this.lists.get(name) || null
  );

  public readonly FindSingleItemListWithName = (name: string): ListValue | null => (
    this.allUnambiguousListValueCache.get(name) || null
  );
}

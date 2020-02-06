import {
  RuntimeListDefinition,
} from './List/ListDefinition';
import {
  ListValue,
} from './Value/ListValue';

export class ListDefinitionsOrigin {
  private _lists: Record<string, RuntimeListDefinition>;  
  get lists(): RuntimeListDefinition[] {
    const listOfLists: RuntimeListDefinition[] = [];
    for (const key in this._lists) {
      listOfLists.push(this._lists[key]);
    }

    return listOfLists;
  }

  private _allUnambiguousListValueCache: Record<string, ListValue>;
  get allUnambiguousListValueCache(): Record<string, ListValue> {
    return this._allUnambiguousListValueCache;
  }


  constructor(
    lists: RuntimeListDefinition[],
  ) {
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

  public readonly GetListDefinition = (name: string) => (
    this.lists.find((def) => def.name === name) || null
  );

  public readonly FindSingleItemListWithName = (name: string): ListValue => (
    this.allUnambiguousListValueCache[name] || null
  );
}

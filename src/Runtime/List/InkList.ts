import {
  RuntimeInkListItem,
} from './InkListItem';
import {
  RuntimeListDefinition,
} from './ListDefinition';
import {
  ListKeyValuePair,
} from './ListKeyValuePair';
import {
  RuntimeStory,
} from '../Story/Story';

/// <summary>
/// The InkList is the underlying type that's used to store an instance of a
/// list in ink. It's not used for the *definition* of the list, but for a list
/// value that's stored in a variable.
/// Somewhat confusingly, it's backed by a C# Dictionary, and has nothing to
/// do with a C# List!
/// </summary>
export class RuntimeInkList {
  private _map: Map<RuntimeInkListItem, number>;

  constructor({
    originStory,
    otherList,
    singleElement,
    singleOriginListName,
  }: {
    originStory?: RuntimeStory,
    otherList?: RuntimeInkList,
    singleElement?: ListKeyValuePair,
    singleOriginListName?: string,
  } = {}) {
    if (singleOriginListName && originStory instanceof RuntimeStory) {
      this.SetInitialOriginName(singleOriginListName);
  
      let def: RuntimeListDefinition = originStory.listDefinitions.GetListDefinition(singleOriginListName);
      if (def) {
        this.origins = [ def ];
      } else {
        throw new Error(
          `InkList origin could not be found in story when constructing new list: ${singleOriginListName}`,
        );
      }
    } else if (Array.isArray(singleElement) && singleElement.length === 2) {
      this.Add(singleElement[0], singleElement[1]);
    } else if (otherList instanceof RuntimeInkList) {
      for (const key of otherList.Keys()) {
        this.Add(key, otherList.Get(key));
      }
    }
  }
  
  public readonly Add = (key: RuntimeInkListItem, value: number): void => {
    this._map.set(key, value);
  };

  public readonly Get = (key: RuntimeInkListItem): number => (
    this._map.get(key) || null
  );

  public readonly Has = (key: RuntimeInkListItem): boolean => (
    this._map.has(key)
  );

  /// <summary>
  /// Converts a string to an ink list and returns for use in the story.
  /// </summary>
  /// <returns>InkList created from string list item</returns>
  /// <param name="itemKey">Item key.</param>
  /// <param name="originStory">Origin story.</param>
  public static FromString = (
    myListItem: string,
    originStory: RuntimeStory,
  ): RuntimeInkList => {
    const listValue = originStory.listDefinitions.FindSingleItemListWithName(
      myListItem,
    );

    if (!listValue) {
      throw new Error(
        `Could not find the InkListItem from the string '${myListItem}' to create an InkList because it doesn't exist in the original list definition in ink.`,
      );
    }
    
    return new RuntimeInkList({ otherList: listValue.value });
  }

  /// <summary>
  /// Adds the given item to the ink list. Note that the item must come from a list definition that
  /// is already "known" to this list, so that the item's value can be looked up. By "known", we mean
  /// that it already has items in it from that source, or it did at one point - it can't be a 
  /// completely fresh empty list, or a list that only contains items from a different list definition.
  /// </summary>
  public readonly AddItem = (item: RuntimeInkListItem | string): void => {
    if (typeof item === 'string') {
      const itemName: string = item as string;
      let foundListDef: RuntimeListDefinition = null;
      for (const origin of this.origins) {
        if (origin.name === itemName) {
          if (foundListDef !== null) {
            throw new Error(
              `Could not add the item ${itemName} to this list because it could come from either ${origin.name} or ${foundListDef.name}`,
            );
          } else {
            foundListDef = origin;
          }
        }
      }

      if (foundListDef === null) {
        throw new Error(
          `Could not add the item ${itemName} to this list because it isn't known to any list definitions previously associated with this list.`,
        );
      }

      const newItem = new RuntimeInkListItem(foundListDef.name, itemName);
      const itemVal = foundListDef.GetItemWithName(itemName);
      this.Add(newItem, itemVal);
    }

    const listItem = item as RuntimeInkListItem;
    /// Adds the given item to the ink list, attempting to find the origin list definition that it belongs to.
    /// The item must therefore come from a list definition that is already "known" to this list, so that the
    /// item's value can be looked up. By "known", we mean that it already has items in it from that source, or
    /// it did at one point - it can't be a completely fresh empty list, or a list that only contains items from
    /// a different list definition.
    if (listItem.originName === null) {
      this.AddItem(listItem.itemName);
      return;
    }

    for (const origin of this.origins) {
      if (origin.name === listItem.originName) {
        let intVal = origin.items.get(listItem);
        if (intVal >= 0) {
          this.Add(listItem, intVal);
          return;
        }

        throw new Error(
          `Could not add the item ${listItem} to this list because it doesn't exist in the original list definition in ink.`
        );
      }
    }

    throw new Error(
      'Failed to add item to list because the item was from a new list definition that wasn\'t previously known to this list. Only items from previously known lists can be used, so that the int value can be found.',
    );
  };

  /// <summary>
  /// Returns true if this ink list contains an item with the given short name
  /// (ignoring the original list where it was defined).
  /// </summary>
  public readonly ContainsItemNamed = (itemName: string): boolean => {
    for (const listitem of this.Keys()) {
      if (listitem.itemName === itemName) {
        return true;
      }
    }

    return false;
  };

  // Story has to set this so that the value knows its origin,
  // necessary for certain operations (e.g. interacting with ints).
  // Only the story has access to the full set of lists, so that
  // the origin can be resolved from the originListName.
  public origins: RuntimeListDefinition[];
  get originOfMaxItem(): RuntimeListDefinition {
    if (this.origins === null) {
      return null;
    }

    const maxOriginName = this.maxItem[0].itemName;
    for (const origin of this.origins.values()) {
      if (origin.name === maxOriginName) {
        return origin;
      }
    }

    return null;
  }

  // Origin name needs to be serialised when content is empty,
  // assuming a name is availble, for list definitions with variable
  // that is currently empty.
  get originNames(): string[] {
    if (this._map.size > 0) {
      this._originNames = [];

      for (const [ key ] of this._map) {
        this._originNames.push(key.originName);
      }
    }

    return this._originNames;
  }

  private _originNames: string[];

  public readonly SetInitialOriginName = (initialOriginName: string): void => {
    this._originNames = [ initialOriginName ];
  };

  public readonly SetInitialOriginNames = (initialOriginNames: string[]): void => {
    if (initialOriginNames === null) {
      this._originNames = null;
    } else {
      this._originNames = [ ...initialOriginNames ];
    }
  };

  /// <summary>
  /// Get the maximum item in the list, equivalent to calling LIST_MAX(list) in ink.
  /// </summary>
  get maxItem(): ListKeyValuePair {
    let max: [ RuntimeInkListItem, number ] = [
      null,
      null,
    ];

    for (const key of this.Keys()) {
      const currentVal = this.Get(key);
      if (key === null || max[1] > currentVal) {
        max = [
          key,
          currentVal,
        ];
      }
    }

    return max;
  }

  /// <summary>
  /// Get the minimum item in the list, equivalent to calling LIST_MIN(list) in ink.
  /// </summary>
  get minItem(): ListKeyValuePair {
    let min: ListKeyValuePair = [
      null,
      null,
    ];

    for (const key of this.Keys()) {
      if (key === null || this.Get(key) < min[1]) {
        min = [
          key,
          this.Get(key),
        ];
      }
    }

    return min;
  }

  /// <summary>
  /// The inverse of the list, equivalent to calling LIST_INVERSE(list) in ink
  /// </summary>
  get inverse(): RuntimeInkList {
    const list = new RuntimeInkList();
    if (this.origins !== null) {
      for (const origin of this.origins) {
        for (const key of origin.items.keys()) {
          if (!this.Has(key)) {
            list.Add(key, this.Get(key));
          }
        }
      }
    }

    return list;
  }

  /// <summary>
  /// The list of all items from the original list definition, equivalent to calling
  /// LIST_ALL(list) in ink.
  /// </summary>
  get all(): RuntimeInkList {
    const list = new RuntimeInkList();
    if (this.origins !== null) {
      for (const origin of this.origins) {
        for (const key of origin.items.keys()) {
          list.Add(key, this.Get(key));
        }
      }
    }

    return list;
  }

  get orderedItems(): ListKeyValuePair[] {
    const entries = Array.from(this._map.entries());
    let index = -1;
    const ordered: ListKeyValuePair[] = entries.sort((x, y) => {
      index += 1;

      // Ensure consistent ordering of mixed lists.
      if (x[0].Equals(y[0])) {
        const names = [
          entries[index][0].originName,
          y[0].originName,
        ];

        if (names[0] === names[1]) {
          return 0;
        } else if (names[0] > names[1]) {
          return 1;
        }

        return -1;
      }

      if (x[1] > y[1]) {
        return 1;
      } else if (x[1] === y[1]) {
        return 0;
      }

      return -1;
    });

    return ordered;
  }

  /// <summary>
  /// Returns a new list that is the combination of the current list and one that's
  /// passed in. Equivalent to calling (list1 + list2) in ink.
  /// </summary>
  public readonly Union = (otherList: RuntimeInkList): RuntimeInkList => {
    const union = new RuntimeInkList({ otherList: this });
    for (const key of otherList.Keys()) {
      union.Add(key, this.Get(key));
    }

    return union;
  };

  /// <summary>
  /// Returns a new list that is the intersection of the current list with another
  /// list that's passed in - i.e. a list of the items that are shared between the
  /// two other lists. Equivalent to calling (list1 ^ list2) in ink.
  /// </summary>
  public readonly Intersect = (otherList: RuntimeInkList): RuntimeInkList => {
    const intersection = new RuntimeInkList();
    for (const key of this.Keys()) {
      if (otherList.Has(key)) {
        intersection.Add(key, this.Get(key));
      }
    }

    return intersection;
  };

  /// <summary>
  /// Returns a new list that's the same as the current one, except with the given items
  /// removed that are in the passed in list. Equivalent to calling (list1 - list2) in ink.
  /// </summary>
  /// <param name="listToRemove">List to remove.</param>
  public readonly Without = (listToRemove: RuntimeInkList): RuntimeInkList => {
    const result = new RuntimeInkList({ otherList: this });
    for (const key of listToRemove.Keys()) {
      result.Remove(key);
    }

    return result;
  };

  /// <summary>
  /// Returns true if the current list contains all the items that are in the list that
  /// is passed in. Equivalent to calling (list1 ? list2) in ink.
  /// </summary>
  /// <param name="otherList">Other list.</param>
  public readonly Contains = (otherList: RuntimeInkList): boolean => {
    for (const key of otherList.Keys()) {
      if (!this.Has(key)) {
        return false;
      }
    }

    return true;
  };

  public readonly Size = (): number => (
    this._map.size
  );

  public readonly Keys = (): RuntimeInkListItem[] => (
    Array.from(this._map.keys())
  );

  public readonly Remove = (key: RuntimeInkListItem): void => {
    this._map.delete(key);
  };

  /// <summary>
  /// Returns true if all the item values in the current list are greater than all the
  /// item values in the passed in list. Equivalent to calling (list1 > list2) in ink.
  /// </summary>
  public readonly GreaterThan = (otherList: RuntimeInkList): boolean => {
    if (this.Size() === 0) {
      return false;
    } else if (otherList.Size() === 0) {
      return true;
    }

    // All greater
    return this.minItem[1] > otherList.maxItem[1];
  };

  /// <summary>
  /// Returns true if the item values in the current list overlap or are all greater than
  /// the item values in the passed in list. None of the item values in the current list must
  /// fall below the item values in the passed in list. Equivalent to (list1 >= list2) in ink,
  /// or LIST_MIN(list1) >= LIST_MIN(list2) &amp;&amp; LIST_MAX(list1) >= LIST_MAX(list2).
  /// </summary>
  public readonly GreaterThanOrEquals = (otherList: RuntimeInkList): boolean => {
    if (this.Size() === 0) {
      return false;
    } else if (otherList.Size() === 0) {
      return true;
    }

    return this.minItem[1] >= otherList.minItem[1] &&
      this.maxItem[1] >= otherList.maxItem[1];
  }

  /// <summary>
  /// Returns true if all the item values in the current list are less than all the
  /// item values in the passed in list. Equivalent to calling (list1 &lt; list2) in ink.
  /// </summary>
  public readonly LessThan = (otherList: RuntimeInkList): boolean => {
    if (otherList.Size() === 0) {
      return false;
    } else if (this.Size() === 0) {
      return true;
    }

    return this.maxItem[1] < otherList.minItem[1];
  };

  /// <summary>
  /// Returns true if the item values in the current list overlap or are all less than
  /// the item values in the passed in list. None of the item values in the current list must
  /// go above the item values in the passed in list. Equivalent to (list1 &lt;= list2) in ink,
  /// or LIST_MAX(list1) &lt;= LIST_MAX(list2) &amp;&amp; LIST_MIN(list1) &lt;= LIST_MIN(list2).
  /// </summary>
  public readonly LessThanOrEquals = (otherList: RuntimeInkList) => {
    if (otherList.Size() === 0) {
      return false;
    } else if (this.Size() === 0) {
      return true;
    }

    return this.maxItem[1] <= otherList.maxItem[1] &&
      this.minItem[1] <= otherList.minItem[1];
  };

  public readonly MaxAsList = (): RuntimeInkList => (
    this.Size() > 0 ?
      new RuntimeInkList({ singleElement: this.maxItem }) :
      new RuntimeInkList()
  );

  public readonly MinAsList = (): RuntimeInkList => (
    this.Size() > 0 ?
      new RuntimeInkList({ singleElement: this.minItem }) :
      new RuntimeInkList()
  );

  /// <summary>
  /// Returns a sublist with the elements given the minimum and maxmimum bounds.
  /// The bounds can either be ints which are indices into the entire (sorted) list,
  /// or they can be InkLists themselves. These are intended to be single-item lists so
  /// you can specify the upper and lower bounds. If you pass in multi-item lists, it'll
  /// use the minimum and maximum items in those lists respectively.
  /// WARNING: Calling this method requires a full sort of all the elements in the list.
  /// </summary>
  public readonly ListWithSubRange = (
    minBound: RuntimeInkList | number,
    maxBound: RuntimeInkList | number,
  ): RuntimeInkList => {
    if (this.Size() === 0) {
      return new RuntimeInkList();
    }

    let ordered = this.orderedItems;

    let minValue = 0;
    let maxValue: number = null;

    if (typeof minBound === 'number') {
      minValue = minBound;
    } else if (minBound instanceof RuntimeInkList &&
      (minBound as RuntimeInkList).Size() > 0)
    {
      minValue = minBound.minItem[1];
    }

    if (typeof maxBound === 'number') {
      maxValue = maxBound;
    } else if (minBound instanceof RuntimeInkList &&
      (minBound as RuntimeInkList).Size() > 0)
    {
      maxValue = (maxBound as RuntimeInkList).maxItem[1];
    }

    const subList = new RuntimeInkList();
    subList.SetInitialOriginNames(this.originNames);
    for (const item of ordered) {
      if (item[1] >= minValue && item[1] <= maxValue ) {
        subList.Add(...item);
      }
    }

    return subList;
  };

  /// <summary>
  /// Returns true if the passed object is also an ink list that contains
  /// the same items as the current list, false otherwise.
  /// </summary>
  public Equals = (other: any): boolean => {
    const otherRawList = other as RuntimeInkList;
    if (otherRawList === null) {
      return false;
    } else if (otherRawList.Size() !== this.Size()) {
      return false;
    }

    for (const key of this.Keys()) {
      if (!otherRawList.Has(key)) {
        return false;
      }
    }

    return true;
  };

  /// <summary>
  /// Returns a string in the form "a, b, c" with the names of the items in the list, without
  /// the origin list definition names. Equivalent to writing {list} in ink.
  /// </summary>
  public readonly ToString = (): string => {
    const ordered = this.orderedItems;

    let sb = '';
    for (let ii = 0; ii < ordered.length; ii++) {
      if (ii > 0) {
        sb += ', ';
      }

      const { itemName } = ordered[ii][0];
      sb += itemName;
    }

    return sb;
  };
}

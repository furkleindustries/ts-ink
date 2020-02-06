import { RuntimeInkListItem, } from './InkListItem';
import { RuntimeStory, } from '../Story/Story';
/// <summary>
/// The InkList is the underlying type that's used to store an instance of a
/// list in ink. It's not used for the *definition* of the list, but for a list
/// value that's stored in a variable.
/// Somewhat confusingly, it's backed by a C# Dictionary, and has nothing to
/// do with a C# List!
/// </summary>
export class RuntimeInkList {
    constructor({ originStory, otherList, singleElement, singleOriginListName, } = {}) {
        this.Add = (key, value) => {
            this._map.set(key, value);
        };
        this.Get = (key) => (this._map.get(key) || null);
        this.Has = (key) => (this._map.has(key));
        /// <summary>
        /// Adds the given item to the ink list. Note that the item must come from a list definition that
        /// is already "known" to this list, so that the item's value can be looked up. By "known", we mean
        /// that it already has items in it from that source, or it did at one point - it can't be a 
        /// completely fresh empty list, or a list that only contains items from a different list definition.
        /// </summary>
        this.AddItem = (item) => {
            if (typeof item === 'string') {
                const itemName = item;
                let foundListDef = null;
                for (const origin of this.origins) {
                    if (origin.name === itemName) {
                        if (foundListDef !== null) {
                            throw new Error(`Could not add the item ${itemName} to this list because it could come from either ${origin.name} or ${foundListDef.name}`);
                        }
                        else {
                            foundListDef = origin;
                        }
                    }
                }
                if (foundListDef === null) {
                    throw new Error(`Could not add the item ${itemName} to this list because it isn't known to any list definitions previously associated with this list.`);
                }
                const newItem = new RuntimeInkListItem(foundListDef.name, itemName);
                const itemVal = foundListDef.GetItemWithName(itemName);
                this.Add(newItem, itemVal);
            }
            const listItem = item;
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
                    throw new Error(`Could not add the item ${listItem} to this list because it doesn't exist in the original list definition in ink.`);
                }
            }
            throw new Error('Failed to add item to list because the item was from a new list definition that wasn\'t previously known to this list. Only items from previously known lists can be used, so that the int value can be found.');
        };
        /// <summary>
        /// Returns true if this ink list contains an item with the given short name
        /// (ignoring the original list where it was defined).
        /// </summary>
        this.ContainsItemNamed = (itemName) => {
            for (const listitem of this.Keys()) {
                if (listitem.itemName === itemName) {
                    return true;
                }
            }
            return false;
        };
        this.SetInitialOriginName = (initialOriginName) => {
            this._originNames = [initialOriginName];
        };
        this.SetInitialOriginNames = (initialOriginNames) => {
            if (initialOriginNames === null) {
                this._originNames = null;
            }
            else {
                this._originNames = [...initialOriginNames];
            }
        };
        /// <summary>
        /// Returns a new list that is the combination of the current list and one that's
        /// passed in. Equivalent to calling (list1 + list2) in ink.
        /// </summary>
        this.Union = (otherList) => {
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
        this.Intersect = (otherList) => {
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
        this.Without = (listToRemove) => {
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
        this.Contains = (otherList) => {
            for (const key of otherList.Keys()) {
                if (!this.Has(key)) {
                    return false;
                }
            }
            return true;
        };
        this.Size = () => (this._map.size);
        this.Keys = () => (Array.from(this._map.keys()));
        this.Remove = (key) => {
            this._map.delete(key);
        };
        /// <summary>
        /// Returns true if all the item values in the current list are greater than all the
        /// item values in the passed in list. Equivalent to calling (list1 > list2) in ink.
        /// </summary>
        this.GreaterThan = (otherList) => {
            if (this.Size() === 0) {
                return false;
            }
            else if (otherList.Size() === 0) {
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
        this.GreaterThanOrEquals = (otherList) => {
            if (this.Size() === 0) {
                return false;
            }
            else if (otherList.Size() === 0) {
                return true;
            }
            return this.minItem[1] >= otherList.minItem[1] &&
                this.maxItem[1] >= otherList.maxItem[1];
        };
        /// <summary>
        /// Returns true if all the item values in the current list are less than all the
        /// item values in the passed in list. Equivalent to calling (list1 &lt; list2) in ink.
        /// </summary>
        this.LessThan = (otherList) => {
            if (otherList.Size() === 0) {
                return false;
            }
            else if (this.Size() === 0) {
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
        this.LessThanOrEquals = (otherList) => {
            if (otherList.Size() === 0) {
                return false;
            }
            else if (this.Size() === 0) {
                return true;
            }
            return this.maxItem[1] <= otherList.maxItem[1] &&
                this.minItem[1] <= otherList.minItem[1];
        };
        this.MaxAsList = () => (this.Size() > 0 ?
            new RuntimeInkList({ singleElement: this.maxItem }) :
            new RuntimeInkList());
        this.MinAsList = () => (this.Size() > 0 ?
            new RuntimeInkList({ singleElement: this.minItem }) :
            new RuntimeInkList());
        /// <summary>
        /// Returns a sublist with the elements given the minimum and maxmimum bounds.
        /// The bounds can either be ints which are indices into the entire (sorted) list,
        /// or they can be InkLists themselves. These are intended to be single-item lists so
        /// you can specify the upper and lower bounds. If you pass in multi-item lists, it'll
        /// use the minimum and maximum items in those lists respectively.
        /// WARNING: Calling this method requires a full sort of all the elements in the list.
        /// </summary>
        this.ListWithSubRange = (minBound, maxBound) => {
            if (this.Size() === 0) {
                return new RuntimeInkList();
            }
            let ordered = this.orderedItems;
            let minValue = 0;
            let maxValue = null;
            if (typeof minBound === 'number') {
                minValue = minBound;
            }
            else if (minBound instanceof RuntimeInkList &&
                minBound.Size() > 0) {
                minValue = minBound.minItem[1];
            }
            if (typeof maxBound === 'number') {
                maxValue = maxBound;
            }
            else if (minBound instanceof RuntimeInkList &&
                minBound.Size() > 0) {
                maxValue = maxBound.maxItem[1];
            }
            const subList = new RuntimeInkList();
            subList.SetInitialOriginNames(this.originNames);
            for (const item of ordered) {
                if (item[1] >= minValue && item[1] <= maxValue) {
                    subList.Add(...item);
                }
            }
            return subList;
        };
        /// <summary>
        /// Returns true if the passed object is also an ink list that contains
        /// the same items as the current list, false otherwise.
        /// </summary>
        this.Equals = (other) => {
            const otherRawList = other;
            if (otherRawList === null) {
                return false;
            }
            else if (otherRawList.Size() !== this.Size()) {
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
        this.ToString = () => {
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
        if (singleOriginListName && originStory instanceof RuntimeStory) {
            this.SetInitialOriginName(singleOriginListName);
            let def = originStory.listDefinitions.GetListDefinition(singleOriginListName);
            if (def) {
                this.origins = [def];
            }
            else {
                throw new Error(`InkList origin could not be found in story when constructing new list: ${singleOriginListName}`);
            }
        }
        else if (Array.isArray(singleElement) && singleElement.length === 2) {
            this.Add(singleElement[0], singleElement[1]);
        }
        else if (otherList instanceof RuntimeInkList) {
            for (const key of otherList.Keys()) {
                this.Add(key, otherList.Get(key));
            }
        }
    }
    get originOfMaxItem() {
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
    get originNames() {
        if (this._map.size > 0) {
            this._originNames = [];
            for (const [key] of this._map) {
                this._originNames.push(key.originName);
            }
        }
        return this._originNames;
    }
    /// <summary>
    /// Get the maximum item in the list, equivalent to calling LIST_MAX(list) in ink.
    /// </summary>
    get maxItem() {
        let max = [
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
    get minItem() {
        let min = [
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
    get inverse() {
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
    get all() {
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
    get orderedItems() {
        const entries = Array.from(this._map.entries());
        let index = -1;
        const ordered = entries.sort((x, y) => {
            index += 1;
            // Ensure consistent ordering of mixed lists.
            if (x[0].Equals(y[0])) {
                const names = [
                    entries[index][0].originName,
                    y[0].originName,
                ];
                if (names[0] === names[1]) {
                    return 0;
                }
                else if (names[0] > names[1]) {
                    return 1;
                }
                return -1;
            }
            if (x[1] > y[1]) {
                return 1;
            }
            else if (x[1] === y[1]) {
                return 0;
            }
            return -1;
        });
        return ordered;
    }
}
/// <summary>
/// Converts a string to an ink list and returns for use in the story.
/// </summary>
/// <returns>InkList created from string list item</returns>
/// <param name="itemKey">Item key.</param>
/// <param name="originStory">Origin story.</param>
RuntimeInkList.FromString = (myListItem, originStory) => {
    const listValue = originStory.listDefinitions.FindSingleItemListWithName(myListItem);
    if (!listValue) {
        throw new Error(`Could not find the InkListItem from the string '${myListItem}' to create an InkList because it doesn't exist in the original list definition in ink.`);
    }
    return new RuntimeInkList({ otherList: listValue.value });
};
//# sourceMappingURL=InkList.js.map
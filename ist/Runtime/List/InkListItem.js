/// <summary>
/// The underlying type for a list item in ink. It stores the original list definition
/// name as well as the item name, but without the value of the item. When the value is
/// stored, it's stored in a KeyValuePair of InkListItem and int.
/// </summary>
export class RuntimeInkListItem {
    /// <summary>
    /// Create an item with the given original list definition name, and the name of this
    /// item.
    /// </summary>
    constructor(originNameOrFullName, itemName) {
        /// <summary>
        /// Get the full dot-separated name of the item, in the form "listDefinitionName.itemName".
        /// Calls fullName internally.
        /// </summary>
        this.ToString = () => (this.fullName);
        /// <summary>
        /// Is this item the same as another item?
        /// </summary>
        this.Equals = (obj) => {
            if (obj instanceof RuntimeInkListItem) {
                const otherItem = obj;
                return otherItem.itemName === this.itemName &&
                    otherItem.originName === this.originName;
            }
            return false;
        };
        if (itemName === undefined) {
            var nameParts = originNameOrFullName.split('.');
            this.originName = nameParts[0];
            this.itemName = nameParts[1];
        }
        else {
            this.originName = originNameOrFullName;
            this.itemName = itemName;
        }
    }
    static get Null() {
        return new RuntimeInkListItem(null, null);
    }
    get isNull() {
        return this.originName === null && this.itemName === null;
    }
    /// <summary>
    /// Get the full dot-separated name of the item, in the form "listDefinitionName.itemName".
    /// </summary>
    get fullName() {
        return `${(this.originName === null ? this.originName : '?')}.${this.itemName}`;
    }
}
//# sourceMappingURL=InkListItem.js.map
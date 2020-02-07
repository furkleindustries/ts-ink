/// <summary>
/// The underlying type for a list item in ink. It stores the original list definition
/// name as well as the item name, but without the value of the item. When the value is
/// stored, it's stored in a KeyValuePair of InkListItem and int.
/// </summary>
export class RuntimeInkListItem {
  /// <summary>
  /// The name of the list where the item was originally defined.
  /// </summary>
  public readonly originName: string | null;

  /// <summary>
  /// The main name of the item as defined in ink.
  /// </summary>
  public readonly itemName: string | null;

  
  static get Null(): RuntimeInkListItem {
    return new RuntimeInkListItem(null, null);
  }

  get isNull(): boolean {
    return this.originName === null && this.itemName === null;
  }

  /// <summary>
  /// Get the full dot-separated name of the item, in the form "listDefinitionName.itemName".
  /// </summary>
  get fullName(): string {
    return `${(this.originName === null ? this.originName : '?')}.${this.itemName}`;
  }

  /// <summary>
  /// Create an item with the given original list definition name, and the name of this
  /// item.
  /// </summary>
  constructor(
    originNameOrFullName: string | null,
    itemName?: string | null | undefined,
  )
  {
    if (itemName === undefined && originNameOrFullName) {
      var nameParts = originNameOrFullName.split('.');
      this.originName = nameParts[0];
      this.itemName = nameParts[1];
    } else {
      this.originName = originNameOrFullName;
      this.itemName = itemName || null;
    }
  }

  /// <summary>
  /// Get the full dot-separated name of the item, in the form "listDefinitionName.itemName".
  /// Calls fullName internally.
  /// </summary>
  public readonly ToString = (): string => (
    this.fullName
  );

  /// <summary>
  /// Is this item the same as another item?
  /// </summary>
  public readonly Equals = (obj: any): boolean => {
    if (obj instanceof RuntimeInkListItem) {
      const otherItem = obj as RuntimeInkListItem;
      return otherItem.itemName === this.itemName &&
        otherItem.originName === this.originName;
    }

    return false;
  };
}

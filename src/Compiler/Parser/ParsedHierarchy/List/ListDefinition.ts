import {
  RuntimeInkList,
} from '../../../../Runtime/List/InkList';
import {
  RuntimeInkListItem,
} from '../../../../Runtime/List/InkListItem';
import {
  RuntimeListDefinition,
} from '../../../../Runtime/List/ListDefinition';
import {
  ListElementDefinition,
} from './ListElementDefinition';
import {
  ListValue,
} from '../../../../Runtime/Value/ListValue';
import {
  Object,
} from '../Object';
import {
  Story,
} from '../Story';
import {
  SymbolType,
} from '../SymbolType';
import {
  VariableAssignment,
} from '../Variable/VariableAssignment';

export class ListDefinition extends Object {
  public name: string = '';
  public variableAssignment: VariableAssignment | null = null;

  get typeName() {
    return 'List definition';
  }

  private _elementsByName: Map<string, ListElementDefinition> = new Map();

  get runtimeListDefinition(): RuntimeListDefinition {
    const allItems: Map<string, number> = new Map();
    for (const e of this.itemDefinitions) {
      if (allItems.has(e.name)) {
        allItems.set(e.name, e.seriesValue);
      } else {
        this.Error(`List '${name}' contains dupicate items called '${e.name}'`);
      }
    }

    return new RuntimeListDefinition(name, allItems);
  }

  public readonly ItemNamed = (
    itemName: string,
  ): ListElementDefinition | null => {
    if (this._elementsByName === null) {
      this._elementsByName = new Map();
      for (const el of this.itemDefinitions) {
        this._elementsByName.set(el.name, el);
      }
    }

    const foundElement = this._elementsByName.get(
      itemName,
    ) || null;

    
    return foundElement;
  }

  constructor(public itemDefinitions: ListElementDefinition[]) {
    super();

    let currentValue = 1;
    for (const e of this.itemDefinitions) {
      if (e.explicitValue !== null) {
        currentValue = e.explicitValue;
      }

      e.seriesValue = currentValue;

      currentValue += 1;
    }

    this.AddContent(itemDefinitions as any);
  }

  public readonly GenerateRuntimeObject = (): ListValue => {
    const initialValues = new RuntimeInkList();
    for (const itemDef of this.itemDefinitions) {
      if (itemDef.inInitialList) {
        const item = new RuntimeInkListItem(this.name, itemDef.name);
        initialValues.Add(item, itemDef.seriesValue);
      }
    }

    // Set origin name, so 
    initialValues.SetInitialOriginName(name);

    return new ListValue({ list: initialValues });
  };

  public readonly ResolveReferences = (context: Story): void => {
    super.ResolveReferences(context);
    context.CheckForNamingCollisions(this, name, SymbolType.List);
  };
}

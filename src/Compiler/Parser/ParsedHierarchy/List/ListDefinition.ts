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
  public name: string;
  public variableAssignment: VariableAssignment;

  get typeName() {
    return 'List definition';
  }

  private _elementsByName: Record<string, ListElementDefinition>;

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

  public readonly ItemNamed = (itemName: string): ListElementDefinition => {
    if (this._elementsByName === null) {
      this._elementsByName = {};
      for (const el of this.itemDefinitions) {
        this._elementsByName[el.name] = el;
      }
    }

    let foundElement: ListElementDefinition;
    if (foundElement = this._elementsByName[itemName]) {
      return foundElement;
    }

    return null;
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

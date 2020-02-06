import { RuntimeInkList, } from '../../../../Runtime/List/InkList';
import { RuntimeInkListItem, } from '../../../../Runtime/List/InkListItem';
import { RuntimeListDefinition, } from '../../../../Runtime/List/ListDefinition';
import { ListValue, } from '../../../../Runtime/Value/ListValue';
import { Object, } from '../Object';
import { SymbolType, } from '../SymbolType';
export class ListDefinition extends Object {
    constructor(itemDefinitions) {
        super();
        this.itemDefinitions = itemDefinitions;
        this.ItemNamed = (itemName) => {
            if (this._elementsByName === null) {
                this._elementsByName = {};
                for (const el of this.itemDefinitions) {
                    this._elementsByName[el.name] = el;
                }
            }
            let foundElement;
            if (foundElement = this._elementsByName[itemName]) {
                return foundElement;
            }
            return null;
        };
        this.GenerateRuntimeObject = () => {
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
        this.ResolveReferences = (context) => {
            super.ResolveReferences(context);
            context.CheckForNamingCollisions(this, name, SymbolType.List);
        };
        let currentValue = 1;
        for (const e of this.itemDefinitions) {
            if (e.explicitValue !== null) {
                currentValue = e.explicitValue;
            }
            e.seriesValue = currentValue;
            currentValue += 1;
        }
        this.AddContent(itemDefinitions);
    }
    get typeName() {
        return 'List definition';
    }
    get runtimeListDefinition() {
        const allItems = new Map();
        for (const e of this.itemDefinitions) {
            if (allItems.has(e.name)) {
                allItems.set(e.name, e.seriesValue);
            }
            else {
                this.Error(`List '${name}' contains dupicate items called '${e.name}'`);
            }
        }
        return new RuntimeListDefinition(name, allItems);
    }
}
//# sourceMappingURL=ListDefinition.js.map
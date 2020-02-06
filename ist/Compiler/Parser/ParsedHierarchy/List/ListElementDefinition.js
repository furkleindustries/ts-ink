import { Object, } from '../Object';
import { SymbolType, } from '../SymbolType';
export class ListElementDefinition extends Object {
    constructor(name, inInitialList, explicitValue = null) {
        super();
        this.name = name;
        this.inInitialList = inInitialList;
        this.explicitValue = explicitValue;
        this.GenerateRuntimeObject = () => {
            throw new Error('Not implemented.');
        };
        this.ResolveReferences = (context) => {
            super.ResolveReferences(context);
            context.CheckForNamingCollisions(this, this.name, SymbolType.ListItem);
        };
    }
    get parent() {
        return super.parent;
    }
    get fullName() {
        const parentList = this.parent;
        if (parentList === null) {
            throw new Error('Can\'t get full name without a parent list.');
        }
        return `${parentList.name}.${name}`;
    }
    get typeName() {
        return 'List element';
    }
}
//# sourceMappingURL=ListElementDefinition.js.map
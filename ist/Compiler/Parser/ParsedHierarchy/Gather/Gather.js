import { RuntimeContainer, } from '../../../../Runtime/Container';
import { Object, } from '../Object';
import { SymbolType, } from '../SymbolType';
export class Gather extends Object {
    constructor(name, indentationDepth) {
        super();
        this.name = name;
        this.indentationDepth = indentationDepth;
        this.GenerateRuntimeObject = () => {
            const container = new RuntimeContainer();
            container.name = this.name;
            if (this.story.countAllVisits) {
                container.visitsShouldBeCounted = true;
            }
            container.countingAtStartOnly = true;
            // A gather can have null content, e.g. it's just purely a line with "-"
            if (this.content !== null) {
                for (const c of this.content) {
                    container.AddContent(c.runtimeObject);
                }
            }
            return container;
        };
        this.ResolveReferences = (context) => {
            super.ResolveReferences(context);
            if (this.name !== null && this.name.length > 0) {
                context.CheckForNamingCollisions(this, this.name, SymbolType.SubFlowAndWeave);
            }
        };
    }
    get runtimeContainer() {
        return this.runtimeObject;
    }
}
//# sourceMappingURL=Gather.js.map
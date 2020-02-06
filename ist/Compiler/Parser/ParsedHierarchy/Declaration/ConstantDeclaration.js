import { Object, } from '../Object';
import { SymbolType, } from '../SymbolType';
export class ConstantDeclaration extends Object {
    constructor(constantName, assignedExpression) {
        super();
        this.constantName = constantName;
        this.GenerateRuntimeObject = () => {
            // Global declarations don't generate actual procedural
            // runtime objects, but instead add a global variable to the story itself.
            // The story then initialises them all in one go at the start of the game.
            return null;
        };
        this.ResolveReferences = (context) => {
            this.ResolveReferences(context);
            context.CheckForNamingCollisions(this, this.constantName, SymbolType.Var);
        };
        // Defensive programming in case parsing of assignedExpression failed
        if (assignedExpression) {
            this.expression = this.AddContent(assignedExpression);
        }
    }
    get typeName() {
        return 'Constant';
    }
}
//# sourceMappingURL=ConstantDeclaration.js.map
import { RuntimeContainer, } from '../../../../Runtime/Container';
import { ListDefinition, } from '../List/ListDefinition';
import { Object, } from '../Object';
import { SymbolType, } from '../SymbolType';
import { RuntimeVariableAssignment, } from '../../../../Runtime/Variable/VariableAssignment';
export class VariableAssignment extends Object {
    constructor({ assignedExpression, isGlobalDeclaration, isTemporaryNewDeclaration, listDef, variableName, }) {
        super();
        this.GenerateRuntimeObject = () => {
            let newDeclScope = null;
            if (this.isGlobalDeclaration) {
                newDeclScope = this.story;
            }
            else if (this.isNewTemporaryDeclaration) {
                newDeclScope = this.ClosestFlowBase();
            }
            if (newDeclScope) {
                newDeclScope.TryAddNewVariableDeclaration(this);
            }
            // Global declarations don't generate actual procedural
            // runtime objects, but instead add a global variable to the story itself.
            // The story then initialises them all in one go at the start of the game.
            if (this.isGlobalDeclaration) {
                return null;
            }
            const container = new RuntimeContainer();
            // The expression's runtimeObject is actually another nested container
            if (this.expression !== null) {
                container.AddContent(this.expression.runtimeObject);
            }
            else if (this.listDefinition !== null) {
                container.AddContent(this.listDefinition.runtimeObject);
            }
            this._runtimeAssignment = new RuntimeVariableAssignment(this.variableName, this.isNewTemporaryDeclaration);
            container.AddContent(this._runtimeAssignment);
            return container;
        };
        this.ResolveReferences = (context) => {
            super.ResolveReferences(context);
            // List definitions are checked for conflicts separately
            if (this.isDeclaration && this.listDefinition === null) {
                context.CheckForNamingCollisions(this, this.variableName, this.isGlobalDeclaration ? SymbolType.Var : SymbolType.Temp);
            }
            // Initial VAR x = [intialValue] declaration, not re-assignment
            if (this.isGlobalDeclaration) {
                const variableReference = this.expression;
                if (variableReference && !variableReference.isConstantReference && !variableReference.isListItemReference) {
                    this.Error('global variable assignments cannot refer to other variables, only literal values, constants and list items');
                }
            }
            if (!this.isNewTemporaryDeclaration) {
                const resolvedVarAssignment = context.ResolveVariableWithName(this.variableName, this);
                if (!resolvedVarAssignment.found) {
                    if (this.variableName in this.story.constants) {
                        this.Error(`Can't re-assign to a constant (do you need to use VAR when declaring '${this.variableName}'?)`, this);
                    }
                    else {
                        this.Error(`Variable could not be found to assign to: '${this.variableName}'`, this);
                    }
                }
                // A runtime assignment may not have been generated if it's the initial global declaration,
                // since these are hoisted out and handled specially in Story.ExportRuntime.
                if (this._runtimeAssignment) {
                    this._runtimeAssignment.isGlobal = resolvedVarAssignment.isGlobal;
                }
            }
        };
        this.variableName = variableName;
        this.isGlobalDeclaration = Boolean(isGlobalDeclaration);
        this.isNewTemporaryDeclaration = Boolean(isTemporaryNewDeclaration);
        // Defensive programming in case parsing of assignedExpression failed
        if (listDef instanceof ListDefinition) {
            this.listDefinition = this.AddContent(listDef);
            this.listDefinition.variableAssignment = this;
            // List definitions are always global
            this.isGlobalDeclaration = true;
        }
        else if (assignedExpression) {
            this.expression = this.AddContent(assignedExpression);
        }
    }
    get typeName() {
        if (this.isNewTemporaryDeclaration) {
            return 'temp';
        }
        else if (this.isGlobalDeclaration) {
            return 'VAR';
        }
        return 'variable assignment';
    }
    get isDeclaration() {
        return this.isGlobalDeclaration || this.isNewTemporaryDeclaration;
    }
}
//# sourceMappingURL=VariableAssignment.js.map
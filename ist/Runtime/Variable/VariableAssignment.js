import { RuntimeObject, } from '../Object';
// The value to be assigned is popped off the evaluation stack, so no need to keep it here
export class RuntimeVariableAssignment extends RuntimeObject {
    constructor(variableName = null, isNewDeclaration = false, isGlobal = false) {
        super();
        this.variableName = variableName;
        this.isNewDeclaration = isNewDeclaration;
        this.isGlobal = isGlobal;
        this.ToString = () => (`VarAssign to ${this.variableName}`);
    }
}
//# sourceMappingURL=VariableAssignment.js.map
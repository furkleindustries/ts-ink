import { Object, } from '../Object';
export class ExternalDeclaration extends Object {
    constructor(name, argumentNames) {
        super();
        this.name = name;
        this.argumentNames = argumentNames;
        this.GenerateRuntimeObject = () => {
            this.story.AddExternal(this);
            // No runtime code exists for an external, only metadata
            return null;
        };
    }
}
//# sourceMappingURL=ExternalDeclaration.js.map
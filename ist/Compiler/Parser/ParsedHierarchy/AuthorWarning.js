import { Object, } from './Object';
export class AuthorWarning extends Object {
    constructor(warningMessage) {
        super();
        this.warningMessage = warningMessage;
        this.GenerateRuntimeObject = () => {
            this.Warning(this.warningMessage);
            return null;
        };
    }
}
//# sourceMappingURL=AuthorWarning.js.map
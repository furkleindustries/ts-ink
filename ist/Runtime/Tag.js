import { RuntimeObject, } from './Object';
export class RuntimeTag extends RuntimeObject {
    constructor(text) {
        super();
        this.text = text;
        this.ToString = () => (`# ${this.text}`);
    }
}
//# sourceMappingURL=Tag.js.map
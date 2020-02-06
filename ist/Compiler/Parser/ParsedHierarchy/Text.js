import { Object, } from './Object';
import { StringValue, } from '../../../Runtime/Value/StringValue';
export class Text extends Object {
    constructor(text) {
        super();
        this.text = text;
        this.GenerateRuntimeObject = () => (new StringValue(this.text));
        this.ToString = () => (this.text);
    }
}
//# sourceMappingURL=Text.js.map
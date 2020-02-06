import { RuntimeControlCommand, } from '../../../../Runtime/ControlCommand';
import { Expression, } from './Expression';
import { Text, } from '../Text';
export class StringExpression extends Expression {
    constructor(content) {
        super();
        this.GenerateIntoContainer = (container) => {
            container.AddContent(RuntimeControlCommand.BeginString());
            for (const c of this.content) {
                container.AddContent(c.runtimeObject);
            }
            container.AddContent(RuntimeControlCommand.EndString());
        };
        this.ToString = () => {
            let sb = '';
            for (const c of this.content) {
                sb += c;
            }
            return sb;
        };
        // Equals override necessary in order to check for CONST multiple definition equality
        this.Equals = (obj) => {
            const otherStr = obj;
            if (otherStr === null) {
                return false;
            }
            // Can only compare direct equality on single strings rather than
            // complex string expressions that contain dynamic logic
            if (!this.isSingleString || !otherStr.isSingleString) {
                return false;
            }
            const thisTxt = this.ToString();
            const otherTxt = otherStr.ToString();
            return thisTxt === otherTxt;
        };
        this.AddContent(content);
    }
    get isSingleString() {
        if (this.content.length !== 1) {
            return false;
        }
        const c = this.content[0];
        if (!(c instanceof Text)) {
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=StringExpression.js.map
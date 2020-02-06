import { RuntimeObject, } from '../Object';
import { RuntimePath, } from '../Path';
export class RuntimeVariableReference extends RuntimeObject {
    constructor(name) {
        super();
        this.ToString = () => (this.name === null ?
            `read_count(${this.pathStringForCount})` :
            `var(${this.name})`);
        if (name) {
            this.name = name;
        }
    }
    get containerForCount() {
        return this.ResolvePath(this.pathForCount).container;
    }
    get pathStringForCount() {
        if (this.pathForCount === null) {
            return null;
        }
        return this.CompactPathString(this.pathForCount);
    }
    set pathStringForCount(value) {
        if (typeof value === 'string') {
            this.pathForCount = null;
        }
        else {
            this.pathForCount = new RuntimePath(value);
        }
    }
}
//# sourceMappingURL=VariableReference.js.map
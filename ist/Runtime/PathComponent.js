import { RuntimePath, } from './Path';
// Immutable Component
export class RuntimePathComponent {
    constructor(arg) {
        this.ToString = () => {
            if (this.isIndex) {
                return String(this.index);
            }
            return this.name;
        };
        this.Equals = (obj) => {
            if (obj !== null && obj.isIndex === this.isIndex) {
                if (this.isIndex) {
                    return this.index == obj.index;
                }
                return this.name === obj.name;
            }
            return false;
        };
        if (typeof arg === 'string') {
            if (arg === null || !arg.length) {
                throw new Error('Path component string was empty.');
            }
            this.name = arg;
            this.index = -1;
        }
        else {
            if (!(arg >= 0)) {
                throw new Error('Path component index was less than 0.');
            }
            this.index = arg;
            this.name = null;
        }
    }
    get isIndex() {
        return this.index >= 0;
    }
    get isParent() {
        return this.name === RuntimePath.parentId;
    }
}
RuntimePathComponent.ToParent = () => (new RuntimePathComponent(RuntimePath.parentId));
//# sourceMappingURL=PathComponent.js.map
import { RuntimePathComponent, } from './PathComponent';
export class RuntimePath {
    constructor({ components, componentsString, head, tail, relative = false, } = {}) {
        this._components = [];
        this.GetComponent = (index) => (this._components[index]);
        this.PathByAppendingPath = (pathToAppend) => {
            const p = new RuntimePath();
            let upwardMoves = 0;
            for (let ii = 0; ii < pathToAppend._components.length; ++ii) {
                if (pathToAppend._components[ii].isParent) {
                    upwardMoves += 1;
                }
                else {
                    break;
                }
            }
            for (let ii = 0; ii < this._components.length - upwardMoves; ++ii) {
                p._components.push(this._components[ii]);
            }
            for (let ii = upwardMoves; ii < pathToAppend._components.length; ++ii) {
                p._components.push(pathToAppend._components[ii]);
            }
            return p;
        };
        this.PathByAppendingComponent = (c) => {
            const p = new RuntimePath();
            p._components.push(...this._components);
            p._components.push(c);
            return p;
        };
        this.ToString = () => (this.componentsString);
        this.Equals = (obj) => {
            if (!obj) {
                return false;
            }
            else if (obj._components.length !== this._components.length) {
                return false;
            }
            else if (obj.isRelative !== this.isRelative) {
                return false;
            }
            return (JSON.stringify(obj._components) === JSON.stringify(this._components));
        };
        if (Array.isArray(components)) {
            this._components.push(...components);
            this.isRelative = relative;
        }
        else if (head && tail) {
            this._components.push(head);
            this._components.push(...tail._components);
        }
        else if (typeof componentsString === 'string' && componentsString) {
            this.componentsString = componentsString;
        }
    }
    static get self() {
        const path = new RuntimePath();
        path.isRelative = true;
        return path;
    }
    get head() {
        if (this._components.length > 0) {
            return this._components[0];
        }
        return null;
    }
    get tail() {
        if (this._components.length >= 2) {
            const tailComps = this._components.slice(1);
            return new RuntimePath({ components: tailComps });
        }
        return RuntimePath.self;
    }
    get length() {
        return this._components.length;
    }
    get lastComponent() {
        const lastComponentIdx = this._components.length - 1;
        if (lastComponentIdx >= 0) {
            return this._components[lastComponentIdx];
        }
        return null;
    }
    get containsNamedComponent() {
        for (const comp of this._components) {
            if (!comp.isIndex) {
                return true;
            }
        }
        return false;
    }
    get componentsString() {
        if (!this._componentsString) {
            this._componentsString = this._components.join('.');
            if (this.isRelative) {
                this._componentsString = `.${this._componentsString}`;
            }
        }
        return this._componentsString;
    }
    set componentsString(value) {
        this._components = [];
        this._componentsString = value;
        // Empty path, empty components
        // (path is to root, like "/" in file system)
        if (!this._componentsString) {
            return;
        }
        // When components start with ".", it indicates a relative path, e.g.
        //   .^.^.hello.5
        // is equivalent to file system style path:
        //  ../../hello/5
        if (this._componentsString[0] === '.') {
            this.isRelative = true;
            this._componentsString = this._componentsString.slice(1);
        }
        else {
            this.isRelative = false;
        }
        const componentStrings = this._componentsString.split('.');
        for (const str of componentStrings) {
            if (Number(str) >= 0) {
                this._components.push(new RuntimePathComponent(Number(str)));
            }
            else {
                this._components.push(new RuntimePathComponent(str));
            }
        }
    }
}
RuntimePath.parentId = '^';
//# sourceMappingURL=Path.js.map
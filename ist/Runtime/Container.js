import { CountFlags, } from './CountFlags';
import { RuntimePath, } from './Path';
import { RuntimePathComponent, } from './PathComponent';
import { RuntimeObject, } from './Object';
import { SearchResult, } from './SearchResult';
import { StringValue, } from './Value/StringValue';
export class RuntimeContainer extends RuntimeObject {
    constructor() {
        super(...arguments);
        this._content = [];
        this.namedContent = new Map();
        this.AddContent = (content) => {
            if (Array.isArray(content)) {
                for (const item of content) {
                    this.AddContent(item);
                }
            }
            else {
                if (content.parent) {
                    throw new Error(`content is already in ${content.parent}`);
                }
                this.content.push(content);
                content.parent = this;
                this.TryAddNamedContent(content);
            }
        };
        this.InsertContent = (contentObj, index) => {
            this.content.splice(index, 0, contentObj);
            if (contentObj.parent) {
                throw new Error(`content is already in ${contentObj.parent}`);
            }
            contentObj.parent = this;
            this.TryAddNamedContent(contentObj);
        };
        this.TryAddNamedContent = (contentObj) => {
            const namedContentObj = contentObj;
            if (namedContentObj !== null && namedContentObj.hasValidName) {
                this.AddToNamedContentOnly(namedContentObj);
            }
        };
        this.AddToNamedContentOnly = (namedContentObj) => {
            if (!(namedContentObj instanceof RuntimeObject)) {
                throw new Error('Can only add Runtime.Objects to a Runtime.Container');
            }
            const runtimeObj = namedContentObj;
            runtimeObj.parent = this;
            this.namedContent.set(namedContentObj.name, namedContentObj);
        };
        this.AddContentsOfContainer = (otherContainer) => {
            this.content.splice(0, 0, ...otherContainer.content);
            for (const obj of otherContainer.content) {
                obj.parent = this;
                this.TryAddNamedContent(obj);
            }
        };
        this.ContentWithPathComponent = (component) => {
            if (component.isIndex) {
                if (component.index >= 0 && component.index < this.content.length) {
                    return this.content[component.index];
                }
                // When path is out of range, quietly return nil
                // (useful as we step/increment forwards through content)
                return null;
            }
            else if (component.isParent) {
                return this.parent;
            }
            if (this.namedContent.has(component.name)) {
                return this.namedContent.get(component.name);
            }
            return null;
        };
        this.ContentAtPath = (path, partialPathStart = 0, partialPathLength = -1) => {
            if (partialPathLength === -1) {
                partialPathLength = path.length;
            }
            let approximate = false;
            let currentContainer = this;
            let currentObj = this;
            for (let ii = partialPathStart; ii < partialPathLength; ++ii) {
                const comp = path.GetComponent(ii);
                // Path component was wrong type
                if (currentContainer == null) {
                    approximate = true;
                    break;
                }
                const foundObj = currentContainer.ContentWithPathComponent(comp);
                // Couldn't resolve entire path?
                if (foundObj === null) {
                    approximate = true;
                    break;
                }
                currentObj = foundObj;
                currentContainer = foundObj;
            }
            const result = new SearchResult(currentObj, approximate);
            return result;
        };
        this.BuildStringOfHierarchy = (sb, indentation, pointedObj) => {
            let str = sb;
            let indent = indentation || 0;
            let pointed = pointedObj || null;
            const appendIndentation = () => {
                const spacesPerIndent = 4;
                str += ' '.repeat(spacesPerIndent * indent);
            };
            appendIndentation();
            str += '[';
            if (this.hasValidName) {
                str += ` (${this.name})`;
            }
            if (this === pointed) {
                str += '  <---';
            }
            str += '\n';
            indent += 1;
            for (let ii = 0; ii < this.content.length; ++ii) {
                const obj = this.content[ii];
                if (obj instanceof RuntimeContainer) {
                    const container = obj;
                    container.BuildStringOfHierarchy(str, indent, pointed);
                }
                else {
                    appendIndentation();
                    if (obj instanceof StringValue) {
                        str += '"';
                        str += obj.ToString().replace(new RegExp(/\n/g), '\\n');
                        str += '"';
                    }
                    else {
                        str += obj.ToString();
                    }
                }
                if (ii !== this.content.length - 1) {
                    str += ',';
                }
                if (!(obj instanceof RuntimeContainer) && obj === pointed) {
                    str += '  <---';
                }
                str += '\n';
            }
            const onlyNamed = {};
            for (const key in this.namedContent) {
                if (!(key in this.content)) {
                    onlyNamed[key] = this.namedContent[key];
                }
                else {
                    continue;
                }
            }
            if (Object.keys(onlyNamed).length > 0) {
                appendIndentation();
                str += '-- named: --';
                for (const key in onlyNamed) {
                    if (!(onlyNamed[key] instanceof RuntimeContainer)) {
                        throw new Error('Can only print out named Containers');
                    }
                    const container = onlyNamed[key];
                    container.BuildStringOfHierarchy(str, indent, pointed);
                    str += 1;
                }
            }
            indent -= 1;
            appendIndentation();
            str += ']';
            return str;
        };
    }
    get content() {
        return this._content;
    }
    set content(value) {
        for (const item of value) {
            this.AddContent(item);
        }
    }
    get namedOnlyContent() {
        let namedOnlyContentMap = new Map();
        for (const [key, value] of this.namedContent) {
            namedOnlyContentMap.set(key, value);
        }
        for (const c in this.content) {
            const named = c;
            if (named && named.hasValidName) {
                namedOnlyContentMap.delete(named.name);
            }
        }
        if (Object.keys(namedOnlyContentMap).length === 0) {
            namedOnlyContentMap = null;
        }
        return namedOnlyContentMap;
    }
    set namedOnlyContent(value) {
        const existingNamedOnly = this.namedOnlyContent;
        if (existingNamedOnly !== null) {
            for (const key in existingNamedOnly) {
                this.namedContent.delete(key);
            }
        }
        if (value === null) {
            return;
        }
        for (const [subkey, subval] of value) {
            if (subkey !== null) {
                this.AddToNamedContentOnly(subval);
            }
        }
    }
    get countFlags() {
        let flags = 0;
        if (this.visitsShouldBeCounted) {
            flags |= CountFlags.Visits;
        }
        if (this.turnIndexShouldBeCounted) {
            flags |= CountFlags.Turns;
        }
        if (this.countingAtStartOnly) {
            flags |= CountFlags.CountStartOnly;
        }
        // If we're only storing CountStartOnly, it serves no purpose,
        // since it's dependent on the other two to be used at all.
        // (e.g. for setting the fact that *if* a gather or choice's
        // content is counted, then is should only be counter at the start)
        // So this is just an optimisation for storage.
        if (flags === CountFlags.CountStartOnly) {
            flags = 0;
        }
        return flags;
    }
    ;
    set countFlags(value) {
        const flag = value;
        if ((flag & CountFlags.Visits) > 0) {
            this.visitsShouldBeCounted = true;
        }
        if ((flag & CountFlags.Turns) > 0) {
            this.turnIndexShouldBeCounted = true;
        }
        if ((flag & CountFlags.CountStartOnly) > 0) {
            this.countingAtStartOnly = true;
        }
    }
    get hasValidName() {
        return this.name !== null && this.name.length > 0;
    }
    get pathToFirstLeafContent() {
        if (this._pathToFirstLeafContent === null) {
            this._pathToFirstLeafContent = this.path.PathByAppendingPath(this.internalPathToFirstLeafContent);
        }
        return this._pathToFirstLeafContent;
    }
    get internalPathToFirstLeafContent() {
        const components = [];
        let container = this;
        while (container !== null) {
            if (container.content.length > 0) {
                components.push(new RuntimePathComponent(0));
                container = container.content[0];
            }
        }
        return new RuntimePath({ components });
    }
}
//# sourceMappingURL=Container.js.map
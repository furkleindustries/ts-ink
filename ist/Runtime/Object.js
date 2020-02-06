import { RuntimePath, } from './Path';
import { RuntimePathComponent, } from './PathComponent';
export class RuntimeObject {
    constructor() {
        this.DebugLineNumberOfPath = (path) => {
            if (path === null) {
                return null;
            }
            // Try to get a line number from debug metadata
            const root = this.rootContentContainer;
            if (root) {
                const targetContent = root.ContentAtPath(path).obj;
                if (targetContent) {
                    const dm = targetContent.debugMetadata;
                    if (dm !== null) {
                        return dm.startLineNumber;
                    }
                }
            }
            return null;
        };
        this.ResolvePath = (path) => {
            if (path.isRelative) {
                let nearestContainer = this;
                if (!nearestContainer) {
                    if (this.parent === null) {
                        throw new Error('Can\'t resolve relative path because we don\'t have a parent');
                    }
                    nearestContainer = this.parent;
                    if (nearestContainer === null) {
                        throw new Error('Expected parent to be a container');
                    }
                    if (!path.GetComponent(0).isParent) {
                        throw new Error('Path was not a parent.');
                    }
                    path = path.tail;
                }
                return nearestContainer.ContentAtPath(path);
            }
            return this.rootContentContainer.ContentAtPath(path);
        };
        this.ConvertPathToRelative = (globalPath) => {
            // 1. Find last shared ancestor
            // 2. Drill up using ".." style (actually represented as "^")
            // 3. Re-build downward chain from common ancestor
            const ownPath = this.path;
            const minPathLength = Math.min(globalPath.length, ownPath.length);
            let lastSharedPathCompIndex = -1;
            for (let ii = 0; ii < minPathLength; ++ii) {
                var ownComp = ownPath.GetComponent(ii);
                var otherComp = globalPath.GetComponent(ii);
                if (ownComp.Equals(otherComp)) {
                    lastSharedPathCompIndex = ii;
                }
                else {
                    break;
                }
            }
            // No shared path components, so just use global path
            if (lastSharedPathCompIndex === -1) {
                return globalPath;
            }
            const numUpwardsMoves = ownPath.length - 1 - lastSharedPathCompIndex;
            const newPathComps = [];
            for (let up = 0; up < numUpwardsMoves; ++up) {
                newPathComps.push(RuntimePathComponent.ToParent());
            }
            for (let down = lastSharedPathCompIndex + 1; down < globalPath.length; ++down) {
                newPathComps.push(globalPath.GetComponent(down));
            }
            var relativePath = new RuntimePath({
                components: newPathComps,
                relative: true,
            });
            return relativePath;
        };
        // Find most compact representation for a path, whether relative or global
        this.CompactPathString = (otherPath) => {
            let globalPathStr = null;
            let relativePathStr = null;
            if (otherPath.isRelative) {
                relativePathStr = otherPath.componentsString;
                globalPathStr = this.path.PathByAppendingPath(otherPath).componentsString;
            }
            else {
                const relativePath = this.ConvertPathToRelative(otherPath);
                relativePathStr = relativePath.componentsString;
                globalPathStr = otherPath.componentsString;
            }
            if (relativePathStr.length < globalPathStr.length) {
                return relativePathStr;
            }
            return globalPathStr;
        };
        this.Copy = () => {
            const typed = 'GetType' in this ? this.GetType() : 'Object';
            throw new Error(`${typed} doesn't support copying.`);
        };
        this.SetChild = (obj, value) => {
            if (obj) {
                obj.parent = null;
            }
            obj = value;
            if (obj) {
                obj.parent = this;
            }
        };
        /// Required for implicit bool comparison
        this.Equals = (obj) => (obj === this);
    }
    get debugMetadata() {
        if (this._debugMetadata === null) {
            if (this.parent) {
                return this.parent.debugMetadata;
            }
        }
        return this._debugMetadata;
    }
    set debugMetadata(value) {
        this._debugMetadata = value;
    }
    get ownDebugMetadata() {
        return this._debugMetadata;
    }
    get path() {
        if (this._path === null) {
            if (parent === null) {
                this._path = new RuntimePath();
            }
            else {
                // Maintain a Stack so that the order of the components
                // is reversed when they're added to the Path.
                // We're iterating up the hierarchy from the leaves/children to the root.
                const components = [];
                let child = this;
                let container = child.parent;
                while (container) {
                    const namedChild = child;
                    if (namedChild != null && namedChild.hasValidName) {
                        components.push(new RuntimePathComponent(namedChild.name));
                    }
                    else {
                        components.push(new RuntimePathComponent(container.content.indexOf(child)));
                    }
                    child = container;
                    container = container.parent;
                }
                this._path = new RuntimePath({ components });
            }
        }
        return this._path;
    }
    ;
    get rootContentContainer() {
        let ancestor = this;
        while (ancestor.parent) {
            ancestor = ancestor.parent;
        }
        return ancestor;
    }
}
//# sourceMappingURL=Object.js.map
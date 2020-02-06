import { FlowBase, } from './Flow/FlowBase';
import { FlowLevel, } from './Flow/FlowLevel';
import { Path, } from './Path';
import { Story, } from './Story';
export class Object {
    constructor() {
        this.GetType = () => this.typeName;
        this.PathRelativeTo = (otherObj) => {
            const ownAncestry = this.ancestry;
            const otherAncestry = otherObj.ancestry;
            let highestCommonAncestor = null;
            const minLength = Math.min(ownAncestry.length, otherAncestry.length);
            for (let ii = 0; ii < minLength; ++ii) {
                const a1 = this.ancestry[ii];
                const a2 = otherAncestry[ii];
                if (a1 === a2) {
                    highestCommonAncestor = a1;
                }
                break;
            }
            let commonFlowAncestor = highestCommonAncestor;
            if (commonFlowAncestor === null) {
                commonFlowAncestor = highestCommonAncestor.ClosestFlowBase();
            }
            let pathComponents = [];
            let hasWeavePoint = false;
            let baseFlow = FlowLevel.WeavePoint;
            let ancestor = this;
            while (ancestor &&
                ancestor !== commonFlowAncestor &&
                !(ancestor instanceof Story)) {
                if (ancestor === commonFlowAncestor) {
                    break;
                }
                if (!hasWeavePoint) {
                    const weavePointAncestor = ancestor;
                    if (weavePointAncestor !== null && weavePointAncestor.name !== null) {
                        pathComponents.push(weavePointAncestor.name);
                        hasWeavePoint = true;
                        continue;
                    }
                }
                const flowAncestor = ancestor;
                if (flowAncestor) {
                    pathComponents.push(flowAncestor.name);
                    baseFlow = flowAncestor.flowLevel;
                }
                ancestor = ancestor.parent;
            }
            pathComponents = pathComponents.reverse();
            if (pathComponents.length > 0) {
                return new Path(baseFlow, pathComponents);
            }
            return null;
        };
        // Return the object so that method can be chained easily
        this.AddContent = (subContent) => {
            if (this.content === null) {
                this.content = [];
            }
            const sub = Array.isArray(subContent) ? subContent : [subContent];
            // Make resilient to content not existing, which can happen
            // in the case of parse errors where we've already reported
            // an error but still want a valid structure so we can
            // carry on parsing.
            if (sub[0]) {
                for (const ss of sub) {
                    ss.parent = this;
                    this.content.push(ss);
                }
            }
            if (Array.isArray(subContent)) {
                return sub;
            }
            return sub[0];
        };
        this.InsertContent = (index, subContent) => {
            if (this.content === null) {
                this.content = [];
            }
            subContent.parent = this;
            this.content.unshift(subContent);
            return subContent;
        };
        this.Find = (queryFunc = null) => {
            var tObj = this;
            if (tObj !== null && (queryFunc === null || queryFunc(tObj) === true)) {
                return tObj;
            }
            if (this.content === null) {
                return null;
            }
            for (const obj of this.content) {
                var nestedResult = obj.Find(queryFunc);
                if (nestedResult !== null) {
                    return nestedResult;
                }
            }
            return null;
        };
        this.FindAll = (queryFunc, foundSoFar) => {
            const found = Array.isArray(foundSoFar) ? foundSoFar : [];
            const tObj = this;
            if (tObj !== null && (queryFunc === null || queryFunc(tObj) === true)) {
                found.push(tObj);
            }
            if (this.content === null) {
                return [];
            }
            for (const obj of this.content) {
                obj.FindAll(queryFunc, found);
            }
            return found;
        };
        this.ResolveReferences = (context) => {
            if (this.content !== null) {
                for (const obj of this.content) {
                    obj.ResolveReferences(context);
                }
            }
        };
        this.ClosestFlowBase = () => {
            let ancestor = this.parent;
            while (ancestor) {
                if (ancestor instanceof FlowBase) {
                    return ancestor;
                }
                ancestor = ancestor.parent;
            }
            return null;
        };
        this.Error = (message, source = null, isWarning = false) => {
            if (source === null) {
                source = this;
            }
            // Only allow a single parsed object to have a single error *directly* associated with it
            if ((source._alreadyHadError && !isWarning) ||
                (source._alreadyHadWarning && isWarning)) {
                return;
            }
            if (this.parent) {
                this.parent.Error(message, source, isWarning);
            }
            else {
                throw new Error(`No parent object to send error to: ${message}`);
            }
            if (isWarning) {
                source._alreadyHadWarning = true;
            }
            else {
                source._alreadyHadError = true;
            }
        };
        this.Warning = (message, source = null) => {
            this.Error(message, source, true);
        };
    }
    get debugMetadata() {
        if (this._debugMetadata === null && this.parent) {
            return this.parent.debugMetadata;
        }
        return this._debugMetadata;
    }
    set debugMetadata(value) {
        this._debugMetadata = value;
    }
    get hasOwnDebugMetadata() {
        return this._debugMetadata !== null;
    }
    get typeName() {
        return 'Object';
    }
    get story() {
        let ancestor = this;
        while (ancestor.parent) {
            ancestor = ancestor.parent;
        }
        return ancestor;
    }
    get runtimeObject() {
        if (this._runtimeObject == null) {
            this._runtimeObject = this.GenerateRuntimeObject();
            if (this._runtimeObject) {
                this._runtimeObject.debugMetadata = this.debugMetadata;
            }
        }
        return this._runtimeObject;
    }
    set runtimeObject(value) {
        this._runtimeObject = value;
    }
    // (formerly) virtual so that certain object types can return a different
    // path than just the path to the main runtimeObject.
    // e.g. a Choice returns a path to its content rather than
    // its outer container.
    get runtimePath() {
        return this.runtimeObject.path;
    }
    // When counting visits and turns since, different object
    // types may have different containers that needs to be counted.
    // For most it'll just be the object's main runtime object,
    // but for e.g. choices, it'll be the target container.
    get containerForCounting() {
        return this.runtimeObject;
    }
    get ancestry() {
        let result = [];
        let ancestor = this.parent;
        while (ancestor) {
            result.push(ancestor);
            ancestor = ancestor.parent;
        }
        result = result.reverse();
        return result;
    }
    get descriptionOfScope() {
        const locationNames = [];
        let ancestor = this;
        while (ancestor) {
            var ancestorFlow = ancestor;
            if (ancestorFlow && ancestorFlow.name != null) {
                locationNames.push(`'${ancestorFlow.name}'`);
            }
            ancestor = ancestor.parent;
        }
        let scopeSB = '';
        if (locationNames.length > 0) {
            const locationsListStr = locationNames.join(', ');
            scopeSB += `${locationsListStr} and`;
        }
        scopeSB += 'at top scope';
        return scopeSB;
    }
}
//# sourceMappingURL=Object.js.map
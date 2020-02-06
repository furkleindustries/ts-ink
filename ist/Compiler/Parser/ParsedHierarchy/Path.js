import { FlowLevel, } from './Flow/FlowLevel';
export class Path {
    constructor(argOne, argTwo) {
        this.ToString = () => {
            if (this._components === null || this._components.length === 0) {
                if (this.baseTargetLevel === FlowLevel.WeavePoint) {
                    return '-> <next gather point>';
                }
                return '<invalid Path>';
            }
            return `-> ${this.dotSeparatedComponents}`;
        };
        this.ResolveFromContext = (context) => {
            if (this._components == null || this._components.length == 0) {
                return null;
            }
            // Find base target of path from current context. e.g.
            //   ==> BASE.sub.sub
            var baseTargetObject = this.ResolveBaseTarget(context);
            if (baseTargetObject === null) {
                return null;
            }
            // Given base of path, resolve final target by working deeper into hierarchy
            //  e.g. ==> base.mid.FINAL
            if (this._components.length > 1) {
                return this.ResolveTailComponents(baseTargetObject);
            }
            return baseTargetObject;
        };
        // Find the root object from the base, i.e. root from:
        //    root.sub1.sub2
        this.ResolveBaseTarget = (originalContext) => {
            const firstComp = this.firstComponent;
            // Work up the ancestry to find the node that has the named object
            let ancestorContext = originalContext;
            while (ancestorContext !== null) {
                // Only allow deep search when searching deeper from original context.
                // Don't allow search upward *then* downward, since that's searching *everywhere*!
                // Allowed examples:
                //  - From an inner gather of a stitch, you should search up to find a knot called 'x'
                //    at the root of a story, but not a stitch called 'x' in that knot.
                //  - However, from within a knot, you should be able to find a gather/choice
                //    anywhere called 'x'
                // (that latter example is quite loose, but we allow it)
                const deepSearch = ancestorContext === originalContext;
                const foundBase = this.TryGetChildFromContext(ancestorContext, firstComp, null, deepSearch);
                if (foundBase !== null) {
                    return foundBase;
                }
                ancestorContext = ancestorContext.parent;
            }
            return null;
        };
        // Find the final child from path given root, i.e.:
        //   root.sub.finalChild
        this.ResolveTailComponents = (rootTarget) => {
            let foundComponent = rootTarget;
            for (let ii = 1; ii < this._components.length; ++ii) {
                const compName = this._components[ii];
                let minimumExpectedLevel;
                var foundFlow = foundComponent;
                if (foundFlow !== null) {
                    minimumExpectedLevel = (foundFlow.flowLevel + 1);
                }
                else {
                    minimumExpectedLevel = FlowLevel.WeavePoint;
                }
                foundComponent = this.TryGetChildFromContext(foundComponent, compName, minimumExpectedLevel);
                if (foundComponent === null) {
                    break;
                }
            }
            return foundComponent;
        };
        // See whether "context" contains a child with a given name at a given flow level
        // Can either be a named knot/stitch (a FlowBase) or a weave point within a Weave (Choice or Gather)
        // This function also ignores any other object types that are neither FlowBase nor Weave.
        // Called from both ResolveBase (force deep) and ResolveTail for the individual components.
        this.TryGetChildFromContext = (context, childName, minimumLevel, forceDeepSearch = false) => {
            // null childLevel means that we don't know where to find it
            const ambiguousChildLevel = minimumLevel === null;
            // Search for WeavePoint within Weave
            const weaveContext = context;
            if (weaveContext !== null &&
                (ambiguousChildLevel || minimumLevel == FlowLevel.WeavePoint)) {
                return weaveContext.WeavePointNamed(childName);
            }
            // Search for content within Flow (either a sub-Flow or a WeavePoint)
            var flowContext = context;
            if (flowContext !== null) {
                // When searching within a Knot, allow a deep searches so that
                // named weave points (choices and gathers) can be found within any stitch
                // Otherwise, we just search within the immediate object.
                const shouldDeepSearch = forceDeepSearch ||
                    flowContext.flowLevel === FlowLevel.Knot;
                return flowContext.ContentWithNameAtLevel(childName, minimumLevel, shouldDeepSearch);
            }
            return null;
        };
        if (Object.values(FlowLevel).includes(argOne)) {
            this._baseTargetLevel = argOne;
            this._components = argTwo;
        }
        else if (Array.isArray(argOne)) {
            this._baseTargetLevel = null;
            this._components = argTwo;
        }
        else {
            this._baseTargetLevel = null;
            this._components = [argOne];
        }
    }
    get baseTargetLevel() {
        if (this.baseLevelIsAmbiguous) {
            return FlowLevel.Story;
        }
        return this._baseTargetLevel;
    }
    get baseLevelIsAmbiguous() {
        return this._baseTargetLevel === null;
    }
    get firstComponent() {
        if (this._components === null || this._components.length === 0) {
            return null;
        }
        return this._components[0];
    }
    get numberOfComponents() {
        return this._components.length;
    }
    get dotSeparatedComponents() {
        return this._components.join('.');
    }
}
//# sourceMappingURL=Path.js.map
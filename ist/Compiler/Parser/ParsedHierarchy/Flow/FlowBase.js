import { Divert, } from '../Divert/Divert';
import { DivertTarget, } from '../Divert/DivertTarget';
import { FlowLevel, } from './FlowLevel';
import { Gather, } from '../Gather/Gather';
import { Knot, } from '../Knot';
import { Object, } from '../Object';
import { Path, } from '../Path';
import { RuntimeContainer, } from '../../../../Runtime/Container';
import { RuntimeDivert, } from '../../../../Runtime/Divert/Divert';
import { RuntimeVariableAssignment, } from '../../../../Runtime/Variable/VariableAssignment';
import { Story, } from '../Story';
import { SymbolType, } from '../SymbolType';
import { Weave, } from '../Weave';
// Base class for Knots and Stitches
export class FlowBase extends Object {
    constructor(name = null, topLevelObjects = null, args = null, isFunction = false, isIncludedStory = false) {
        super();
        this.name = name;
        this.args = args;
        this.isFunction = isFunction;
        this.SplitWeaveAndSubFlowContent = (contentObjs, isRootStory) => {
            const weaveObjs = [];
            const subFlowObjs = [];
            this._subFlowsByName = {};
            for (const obj of contentObjs) {
                const subFlow = obj;
                if (subFlow) {
                    if (this._firstChildFlow === null) {
                        this._firstChildFlow = subFlow;
                    }
                    subFlowObjs.push(obj);
                    this._subFlowsByName[subFlow.name] = subFlow;
                }
                else {
                    weaveObjs.push(obj);
                }
            }
            // Implicit final gather in top level story for ending without warning that you run out of content
            if (isRootStory) {
                weaveObjs.push(new Gather(null, 1), new Divert(new Path('DONE')));
            }
            const finalContent = [];
            if (weaveObjs.length > 0) {
                this._rootWeave = new Weave(weaveObjs, 0);
                finalContent.push(this._rootWeave);
            }
            if (subFlowObjs.length > 0) {
                finalContent.push(...subFlowObjs);
            }
            return finalContent;
        };
        this.PreProcessTopLevelObjects = (topLevelObjects) => {
            // empty by default, used by Story to process included file references
        };
        this.ResolveVariableWithName = (varName, fromNode) => {
            const result = {};
            // Search in the stitch / knot that owns the node first
            const ownerFlow = fromNode === null ?
                this :
                fromNode.ClosestFlowBase();
            // Argument
            if (ownerFlow.args !== null) {
                for (const arg of ownerFlow.args) {
                    if (arg.name === varName) {
                        result.found = true;
                        result.isArgument = true;
                        result.ownerFlow = ownerFlow;
                        return result;
                    }
                }
            }
            // Temp
            const story = this.story; // optimisation
            if (ownerFlow !== story && varName in ownerFlow.variableDeclarations) {
                result.found = true;
                result.ownerFlow = ownerFlow;
                result.isTemporary = true;
                return result;
            }
            // Global
            if (varName in story.variableDeclarations) {
                result.found = true;
                result.ownerFlow = story;
                result.isGlobal = true;
                return result;
            }
            result.found = false;
            return result;
        };
        this.TryAddNewVariableDeclaration = (varDecl) => {
            const varName = varDecl.variableName;
            if (varName in this.variableDeclarations) {
                let prevDeclError = '';
                const debugMetadata = this.variableDeclarations[varName].debugMetadata;
                if (debugMetadata !== null) {
                    prevDeclError = ` (${this.variableDeclarations[varName].debugMetadata})`;
                }
                this.Error(`found declaration variable '${varName}' that was already declared${prevDeclError}`, varDecl, false);
                return;
            }
            this.variableDeclarations[varDecl.variableName] = varDecl;
        };
        this.ResolveWeavePointNaming = () => {
            // Find all weave points and organise them by name ready for
            // diverting. Also detect naming collisions.
            if (this._rootWeave) {
                this._rootWeave.ResolveWeavePointNaming();
            }
            if (this._subFlowsByName !== null) {
                for (const key in this._subFlowsByName) {
                    this._subFlowsByName[key].ResolveWeavePointNaming();
                }
            }
        };
        this.GenerateRuntimeObject = () => {
            let foundReturn = null;
            if (this.isFunction) {
                this.CheckForDisallowedFunctionFlowControl();
            }
            else if (this.flowLevel === FlowLevel.Knot ||
                this.flowLevel === FlowLevel.Stitch) {
                // Non-functon: Make sure knots and stitches don't attempt to use Return statement
                foundReturn = this.Find();
                if (foundReturn !== null) {
                    this.Error(`Return statements can only be used in knots that are declared as functions: == function ${this.name} ==`, foundReturn);
                }
            }
            const container = new RuntimeContainer();
            container.name = this.name;
            if (this.story.countAllVisits) {
                container.visitsShouldBeCounted = true;
            }
            this.GenerateArgumentVariableAssignments(container);
            // Run through content defined for this knot/stitch:
            //  - First of all, any initial content before a sub-stitch
            //    or any weave content is added to the main content container
            //  - The first inner knot/stitch is automatically entered, while
            //    the others are only accessible by an explicit divert
            //       - The exception to this rule is if the knot/stitch takes
            //         parameters, in which case it can't be auto-entered.
            //  - Any Choices and Gathers (i.e. IWeavePoint) found are 
            //    processsed by GenerateFlowContent.
            let contentIdx = 0;
            while (this.content !== null && contentIdx < this.content.length) {
                const obj = this.content[contentIdx];
                // Inner knots and stitches
                if (obj instanceof FlowBase) {
                    const childFlow = obj;
                    const childFlowRuntime = childFlow.runtimeObject;
                    // First inner stitch - automatically step into it
                    // 20/09/2016 - let's not auto step into knots
                    if (contentIdx === 0 &&
                        !childFlow.hasParameters &&
                        this.flowLevel === FlowLevel.Knot) {
                        this._startingSubFlowDivert = new RuntimeDivert();
                        container.AddContent(this._startingSubFlowDivert);
                        this._startingSubFlowRuntime = childFlowRuntime;
                    }
                    // Check for duplicate knots/stitches with same name
                    const namedChild = childFlowRuntime;
                    let existingChild = null;
                    if (existingChild = container.namedContent[namedChild.name]) {
                        const errorMsg = `${this.GetType()} already contains flow named '${namedChild.name}' (at ${existingChild.debugMetadata})`;
                        this.Error(errorMsg, childFlow);
                    }
                    container.AddToNamedContentOnly(namedChild);
                }
                else {
                    // Other content (including entire Weaves that were grouped in the constructor)
                    // At the time of writing, all FlowBases have a maximum of one piece of "other content"
                    // and it's always the root Weave
                    container.AddContent(obj.runtimeObject);
                }
                contentIdx += 1;
            }
            // CHECK FOR FINAL LOOSE ENDS!
            // Notes:
            //  - Functions don't need to terminate - they just implicitly return
            //  - If return statement was found, don't continue finding warnings for missing control flow,
            // since it's likely that a return statement has been used instead of a ->-> or something,
            // or the writer failed to mark the knot as a function.
            //  - _rootWeave may be null if it's a knot that only has stitches
            if (this.flowLevel !== FlowLevel.Story &&
                !this.isFunction &&
                this._rootWeave !== null &&
                foundReturn === null) {
                this._rootWeave.ValidateTermination(this.WarningInTermination);
            }
            return container;
        };
        this.GenerateArgumentVariableAssignments = (container) => {
            if (this.args === null || this.args.length === 0) {
                return;
            }
            // Assign parameters in reverse since they'll be popped off the evaluation stack
            // No need to generate EvalStart and EvalEnd since there's nothing being pushed
            // back onto the evaluation stack.
            for (let ii = this.args.length - 1; ii >= 0; --ii) {
                const paramName = this.args[ii].name;
                const assign = new RuntimeVariableAssignment(paramName, true);
                container.AddContent(assign);
            }
        };
        this.ContentWithNameAtLevel = (name, level = null, deepSearch = false) => {
            // Referencing self?
            if (level === this.flowLevel || level === null && name === this.name) {
                return this;
            }
            if (level === FlowLevel.WeavePoint || level === null) {
                let weavePointResult = null;
                if (this._rootWeave) {
                    weavePointResult = this._rootWeave.WeavePointNamed(name);
                    if (weavePointResult) {
                        return weavePointResult;
                    }
                }
                // Stop now if we only wanted a result if it's a weave point?
                if (level === FlowLevel.WeavePoint) {
                    return deepSearch ? this.DeepSearchForAnyLevelContent(name) : null;
                }
            }
            // If this flow would be incapable of containing the requested level, early out
            // (e.g. asking for a Knot from a Stitch)
            if (level !== null && level < this.flowLevel) {
                return null;
            }
            let subFlow = null;
            if ((subFlow = this._subFlowsByName[name]) &&
                (level === null || level === subFlow.flowLevel)) {
                return subFlow;
            }
            return deepSearch ? this.DeepSearchForAnyLevelContent(name) : null;
        };
        this.DeepSearchForAnyLevelContent = (name) => {
            const weaveResultSelf = this.ContentWithNameAtLevel(name, FlowLevel.WeavePoint, false);
            if (weaveResultSelf) {
                return weaveResultSelf;
            }
            for (const key in this._subFlowsByName) {
                var subFlow = this._subFlowsByName[key];
                var deepResult = subFlow.ContentWithNameAtLevel(name, null, true);
                if (deepResult) {
                    return deepResult;
                }
            }
            return null;
        };
        this.ResolveReferences = (context) => {
            if (this._startingSubFlowDivert) {
                this._startingSubFlowDivert.targetPath = this._startingSubFlowRuntime.path;
            }
            this.ResolveReferences(context);
            // Check validity of parameter names
            if (this.args !== null) {
                for (const arg of this.args) {
                    context.CheckForNamingCollisions(this, arg.name, SymbolType.Arg, 'argument');
                }
                // Separately, check for duplicate arugment names, since they aren't Parsed.Objects,
                // so have to be checked independently.
                for (let ii = 0; ii < this.args.length; ii += 1) {
                    for (let jj = ii + 1; jj < this.args.length; jj += 1) {
                        if (this.args[ii].name == this.args[jj].name) {
                            this.Error(`Multiple arguments with the same name: '${this.args[ii].name}'`);
                        }
                    }
                }
            }
            // Check naming collisions for knots and stitches
            if (this.flowLevel !== FlowLevel.Story) {
                // Weave points aren't FlowBases, so this will only be knot or stitch
                const symbolType = this.flowLevel === FlowLevel.Knot ?
                    SymbolType.Knot :
                    SymbolType.SubFlowAndWeave;
                context.CheckForNamingCollisions(this, this.name, symbolType);
            }
        };
        this.CheckForDisallowedFunctionFlowControl = () => {
            if (!(this instanceof Knot)) {
                this.Error('Functions cannot be stitches - i.e. they should be defined as \'== function myFunc ==\' rather than internal to another knot.');
            }
            // Not allowed sub-flows
            for (const name in this._subFlowsByName) {
                const subFlow = this._subFlowsByName[name];
                this.Error(`Functions may not contain stitches, but saw '${name}' within the function '${this.name}'`, subFlow);
            }
            const allDiverts = this._rootWeave.FindAll();
            for (const divert of allDiverts) {
                if (!divert.isFunctionCall && !(divert.parent instanceof DivertTarget)) {
                    this.Error(`Functions may not contain diverts, but saw '${divert.ToString()}'`, divert);
                }
            }
            const allChoices = this._rootWeave.FindAll();
            for (const choice of allChoices) {
                this.Error(`Functions may not contain choices, but saw '${choice.ToString()}'`, choice);
            }
        };
        this.WarningInTermination = (terminatingObject) => {
            let message = 'Apparent loose end exists where the flow runs out. Do you need a \'-> DONE\' statement, choice or divert?';
            if (terminatingObject.parent === this._rootWeave && this._firstChildFlow) {
                message = `${message} Note that if you intend to enter '${this._firstChildFlow.name}' next, you need to divert to it explicitly.`;
            }
            const terminatingDivert = terminatingObject;
            if (terminatingDivert && terminatingDivert.isTunnel) {
                message += ` When final tunnel to '${terminatingDivert.target} ->' returns it won't have anywhere to go.`;
            }
            this.Warning(message, terminatingObject);
        };
        this.ToString = () => (`${this.typeName} '${this.name}'`);
        this.name = name;
        if (topLevelObjects === null) {
            topLevelObjects = [];
        }
        // Used by story to add includes
        this.PreProcessTopLevelObjects(topLevelObjects);
        topLevelObjects = this.SplitWeaveAndSubFlowContent(topLevelObjects, this instanceof Story && !isIncludedStory);
        this.AddContent(topLevelObjects);
        this.variableDeclarations = {};
    }
    get hasParameters() {
        return this.args !== null && this.args.length > 0;
    }
    get subFlowsByName() {
        return this._subFlowsByName;
    }
    get typeName() {
        if (this.isFunction) {
            return 'Function';
        }
        return String(this.flowLevel);
    }
    ;
}
//# sourceMappingURL=FlowBase.js.map
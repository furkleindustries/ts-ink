import { AuthorWarning, } from './AuthorWarning';
import { RuntimeContainer, } from '../../../Runtime/Container';
import { RuntimeControlCommand, } from '../../../Runtime/ControlCommand';
import { ErrorType, } from '../ErrorType';
import { FlowBase, } from './Flow/FlowBase';
import { FlowLevel } from './Flow/FlowLevel';
import { FunctionCall, } from './FunctionCall';
import { IncludedFile, } from './IncludedFile';
import { ListElementDefinition, } from './List/ListElementDefinition';
import { Path, } from './Path';
import { RuntimeStory, } from '../../../Runtime/Story/Story';
import { SymbolType, } from './SymbolType';
import { Text, } from './Text';
import { RuntimeVariableAssignment, } from '../../../Runtime/Variable/VariableAssignment';
export class Story extends FlowBase {
    constructor(toplevelObjects, isInclude = false) {
        // Don't do anything much on construction, leave it lightweight until
        // the ExportRuntime method is called.
        super(null, toplevelObjects, null, null, isInclude);
        this._dontFlattenContainers = new Set();
        // Build setting for exporting:
        // When true, the visit count for *all* knots, stitches, choices,
        // and gathers is counted. When false, only those that are direclty 
        // referenced by the ink are recorded. Use this flag to allow game-side 
        // querying of  arbitrary knots/stitches etc.
        // Storing all counts is more robust and future proof (updates to the story file
        // that reference previously uncounted visits are possible, but generates a much 
        // larger safe file, with a lot of potentially redundant counts.
        this.countAllVisits = false;
        // Before this function is called, we have IncludedFile objects interspersed
        // in our content wherever an include statement was.
        // So that the include statement can be added in a sensible place (e.g. the
        // top of the file) without side-effects of jumping into a knot that was
        // defined in that include, we separate knots and stitches from anything
        // else defined at the top scope of the included file.
        // 
        // Algorithm: For each IncludedFile we find, split its contents into
        // knots/stiches and any other content. Insert the normal content wherever
        // the include statement was, and append the knots/stitches to the very
        // end of the main story.
        this.PreProcessTopLevelObjects = (topLevelContent) => {
            const flowsFromOtherFiles = [];
            // Inject included files
            let ii = 0;
            while (ii < topLevelContent.length) {
                const obj = topLevelContent[ii];
                if (obj instanceof IncludedFile) {
                    const file = obj;
                    // Remove the IncludedFile itself
                    topLevelContent.splice(ii, 1);
                    // When an included story fails to load, the include
                    // line itself is still valid, so we have to handle it here
                    if (file.includedStory) {
                        const nonFlowContent = [];
                        const subStory = file.includedStory;
                        // Allow empty file
                        if (subStory.content != null) {
                            for (const subStoryObj of subStory.content) {
                                if (subStoryObj instanceof FlowBase) {
                                    flowsFromOtherFiles.push(subStoryObj);
                                }
                                else {
                                    nonFlowContent.push(subStoryObj);
                                }
                            }
                            // Add newline on the end of the include
                            nonFlowContent.push(new Text('\n'));
                            // Add contents of the file in its place
                            topLevelContent.unshift(nonFlowContent[ii]);
                            // Skip past the content of this sub story
                            // (since it will already have recursively included
                            //  any lines from other files)
                            ii += nonFlowContent.length;
                        }
                    }
                    // Include object has been removed, with possible content inserted,
                    // and position of 'i' will have been determined already.
                    continue;
                }
                else {
                    // Non-include: skip over it
                    ii += 1;
                }
            }
            // Add the flows we collected from the included files to the
            // end of our list of our content
            topLevelContent.splice(0, 0, ...flowsFromOtherFiles);
        };
        this.ExportRuntime = (errorHandler = null) => {
            this._errorHandler = errorHandler;
            // Find all constants before main export begins, so that VariableReferences know
            // whether to generate a runtime variable reference or the literal value
            this.constants = {};
            for (const constDecl of this.FindAll()) {
                // Check for duplicate definitions
                let existingDefinition = null;
                if (existingDefinition = this.constants[constDecl.constantName]) {
                    if (existingDefinition.GenerateRuntimeObject().Equals(constDecl.expression)) {
                        const errorMsg = `CONST '${constDecl.constantName}' has been redefined with a different value. Multiple definitions of the same CONST are valid so long as they contain the same value. Initial definition was on ${existingDefinition.debugMetadata}.`;
                        this.Error(errorMsg, constDecl, false);
                    }
                }
                this.constants[constDecl.constantName] = constDecl.expression;
            }
            // List definitions are treated like constants too - they should be usable
            // from other variable declarations.
            this._listDefs = {};
            for (const listDef of this.FindAll()) {
                this._listDefs[listDef.name] = listDef;
            }
            this.externals = {};
            // Resolution of weave point names has to come first, before any runtime code generation
            // since names have to be ready before diverts start getting created.
            // (It used to be done in the constructor for a weave, but didn't allow us to generate
            // errors when name resolution failed.)
            this.ResolveWeavePointNaming();
            // Get default implementation of runtimeObject, which calls ContainerBase's generation method
            const rootContainer = this.runtimeObject;
            // Export initialisation of global variables
            // TODO: We *could* add this as a declarative block to the story itself...
            const variableInitialisation = new RuntimeContainer();
            variableInitialisation.AddContent(RuntimeControlCommand.EvalStart());
            // Global variables are those that are local to the story and marked as global
            const runtimeLists = [];
            for (const varName in this.variableDeclarations) {
                const varDecl = this.variableDeclarations[varName];
                if (varDecl.isGlobalDeclaration) {
                    if (varDecl.listDefinition != null) {
                        this._listDefs[varName] = varDecl.listDefinition;
                        variableInitialisation.AddContent(varDecl.listDefinition.runtimeObject);
                        runtimeLists.push(varDecl.listDefinition.runtimeListDefinition);
                    }
                    else {
                        varDecl.expression.GenerateIntoContainer(variableInitialisation);
                    }
                    const runtimeVarAss = new RuntimeVariableAssignment(varName, true);
                    runtimeVarAss.isGlobal = true;
                    variableInitialisation.AddContent(runtimeVarAss);
                }
            }
            variableInitialisation.AddContent(RuntimeControlCommand.EvalEnd());
            variableInitialisation.AddContent(RuntimeControlCommand.End());
            if (self.Object.keys(this.variableDeclarations).length > 0) {
                variableInitialisation.name = 'global decl';
                rootContainer.AddToNamedContentOnly(variableInitialisation);
            }
            // Signal that it's safe to exit without error, even if there are no choices generated
            // (this only happens at the end of top level content that isn't in any particular knot)
            rootContainer.AddContent(RuntimeControlCommand.Done());
            // Replace runtimeObject with Story object instead of the Runtime.Container generated by Parsed.ContainerBase
            const runtimeStory = new RuntimeStory({
                contentContainer: rootContainer,
                lists: runtimeLists,
            });
            this.runtimeObject = runtimeStory;
            if (this.hadError) {
                return null;
            }
            // Optimisation step - inline containers that can be
            this.FlattenContainersIn(rootContainer);
            // Now that the story has been fulled parsed into a hierarchy,
            // and the derived runtime hierarchy has been built, we can
            // resolve referenced symbols such as variables and paths.
            // e.g. for paths " -> knotName --> stitchName" into an INKPath (knotName.stitchName)
            // We don't make any assumptions that the INKPath follows the same
            // conventions as the script format, so we resolve to actual objects before
            // translating into an INKPath. (This also allows us to choose whether
            // we want the paths to be absolute)
            this.ResolveReferences(this);
            if (this.hadError) {
                return null;
            }
            runtimeStory.ResetState();
            return runtimeStory;
        };
        this.ResolveList = (listName) => {
            let list;
            if (!(list = this._listDefs[listName])) {
                return null;
            }
            return list;
        };
        this.ResolveListItem = (listName, itemName, source = null) => {
            let listDef = null;
            // Search a specific list if we know its name (i.e. the form listName.itemName)
            if (listName != null) {
                if (!(listDef = this._listDefs[listName])) {
                    return null;
                }
                return listDef.ItemNamed(itemName);
            }
            else {
                // Otherwise, try to search all lists
                let foundItem = null;
                let originalFoundList = null;
                for (const namedList in this._listDefs) {
                    const listToSearch = this._listDefs[namedList];
                    const itemInThisList = listToSearch.ItemNamed(itemName);
                    if (itemInThisList) {
                        if (foundItem != null) {
                            this.Error(`Ambiguous item name '${itemName}' found in multiple sets, including ${originalFoundList.name} and ${listToSearch.name}`, source, false);
                        }
                        else {
                            foundItem = itemInThisList;
                            originalFoundList = listToSearch;
                        }
                    }
                }
                return foundItem;
            }
        };
        this.FlattenContainersIn = (container) => {
            // Need to create a collection to hold the inner containers
            // because otherwise we'd end up modifying during iteration
            const innerContainers = new Set();
            for (const c of container.content) {
                const innerContainer = c;
                if (innerContainer) {
                    innerContainers.add(innerContainer);
                }
            }
            // Can't flatten the named inner containers, but we can at least
            // iterate through their children
            if (container.namedContent !== null) {
                for (const namedInnerContainer of container.namedContent) {
                    if (namedInnerContainer[1]) {
                        innerContainers.add(namedInnerContainer[1]);
                    }
                }
            }
            for (const innerContainer of innerContainers) {
                this.TryFlattenContainer(innerContainer);
                this.FlattenContainersIn(innerContainer);
            }
        };
        this.TryFlattenContainer = (container) => {
            if (container.namedContent ||
                container.hasValidName ||
                this._dontFlattenContainers.has(container)) {
                return;
            }
            // Inline all the content in container into the parent
            const parentContainer = container.parent;
            if (parentContainer) {
                let contentIdx = parentContainer.content.indexOf(container);
                parentContainer.content.splice(contentIdx, 1);
                const dm = container.ownDebugMetadata;
                for (const innerContent of container.content) {
                    innerContent.parent = null;
                    if (dm !== null && innerContent.ownDebugMetadata === null) {
                        innerContent.debugMetadata = dm;
                    }
                    parentContainer.InsertContent(innerContent, contentIdx);
                    contentIdx += 1;
                }
            }
        };
        this.Error = (message, source, isWarning) => {
            let errorType = isWarning ? ErrorType.Warning : ErrorType.Error;
            let sb = '';
            if (source instanceof AuthorWarning) {
                sb += 'TODO: ';
                errorType = ErrorType.Author;
            }
            else if (isWarning) {
                sb += 'WARNING: ';
            }
            else {
                sb += 'ERROR: ';
            }
            if (source &&
                source.debugMetadata !== null &&
                source.debugMetadata.startLineNumber >= 1) {
                if (source.debugMetadata.fileName != null) {
                    sb += `'${source.debugMetadata.fileName}' `;
                }
                sb += `line ${source.debugMetadata.startLineNumber}: `;
            }
            sb += message;
            message = sb;
            if (this._errorHandler !== null) {
                this._errorHandler(message, errorType);
            }
            else {
                throw new Error(message);
            }
            this._hadError = errorType === ErrorType.Error;
            this._hadWarning = errorType === ErrorType.Warning;
        };
        this.ResetError = () => {
            this._hadError = false;
            this._hadWarning = false;
        };
        this.IsExternal = (namedFuncTarget) => (namedFuncTarget in this.externals);
        this.AddExternal = (decl) => {
            if (decl.name in this.externals) {
                this.Error(`Duplicate EXTERNAL definition of '${decl.name}'`, decl, false);
            }
            else {
                this.externals[decl.name] = decl;
            }
        };
        this.DontFlattenContainer = (container) => {
            this._dontFlattenContainers.add(container);
        };
        this.NameConflictError = (obj, name, existingObj, typeNameToPrint) => {
            obj.Error(`${typeNameToPrint} '${name}': name has already been used for a ${existingObj.typeName.toLowerCase()} on ${existingObj.debugMetadata}`);
        };
        // Check given symbol type against everything that's of a higher priority in the ordered SymbolType enum (above).
        // When the given symbol type level is reached, we early-out / return.
        this.CheckForNamingCollisions = (obj, name, symbolType, typeNameOverride = null) => {
            const typeNameToPrint = typeNameOverride || obj.typeName;
            if (Story.IsReservedKeyword(name)) {
                obj.Error(`'${name}' cannot be used for the name of a ${typeNameToPrint.toLowerCase()} because it's a reserved keyword`);
                return;
            }
            else if (FunctionCall.IsBuiltIn(name)) {
                obj.Error(`'${name}' cannot be used for the name of a ${typeNameToPrint.toLowerCase()} because it's a built in function`);
                return;
            }
            // Top level knots
            const knotOrFunction = this.ContentWithNameAtLevel(name, FlowLevel.Knot);
            if (knotOrFunction &&
                (knotOrFunction !== obj || symbolType === SymbolType.Arg)) {
                this.NameConflictError(obj, name, knotOrFunction, typeNameToPrint);
                return;
            }
            if (symbolType < SymbolType.List) {
                return;
            }
            // Lists
            for (const listDefName in this._listDefs) {
                const listDef = this._listDefs[listDefName];
                if (name === listDefName &&
                    obj !== listDef &&
                    listDef.variableAssignment !== obj) {
                    this.NameConflictError(obj, name, listDef, typeNameToPrint);
                }
                // We don't check for conflicts between individual elements in 
                // different lists because they are namespaced.
                if (!(obj instanceof ListElementDefinition)) {
                    for (const item of listDef.itemDefinitions) {
                        if (name === item.name) {
                            this.NameConflictError(obj, name, item, typeNameToPrint);
                        }
                    }
                }
            }
            // Don't check for VAR->VAR conflicts because that's handled separately
            // (necessary since checking looks up in a dictionary)
            if (symbolType <= SymbolType.Var) {
                return;
            }
            // Global variable collision
            let varDecl = null;
            if (varDecl = this.variableDeclarations[name]) {
                if (varDecl != obj && varDecl.isGlobalDeclaration && varDecl.listDefinition == null) {
                    this.NameConflictError(obj, name, varDecl, typeNameToPrint);
                }
            }
            if (symbolType < SymbolType.SubFlowAndWeave) {
                return;
            }
            // Stitches, Choices and Gathers
            var path = new Path(name);
            var targetContent = path.ResolveFromContext(obj);
            if (targetContent && targetContent !== obj) {
                this.NameConflictError(obj, name, targetContent, typeNameToPrint);
                return;
            }
            if (symbolType < SymbolType.Arg) {
                return;
            }
            // Arguments to the current flow
            if (symbolType !== SymbolType.Arg) {
                let flow = obj;
                if (flow === null) {
                    flow = obj.ClosestFlowBase();
                }
                if (flow && flow.hasParameters) {
                    for (const arg of flow.args) {
                        if (arg.name === name) {
                            obj.Error(`${typeNameToPrint} '${name}': Name has already been used for a argument to ${flow.name} on ${flow.debugMetadata}`);
                            return;
                        }
                    }
                }
            }
        };
    }
    get flowLevel() {
        return FlowLevel.Story;
    }
    get hadError() {
        return this._hadError;
    }
    get hadWarning() {
        return this._hadWarning;
    }
}
Story.IsReservedKeyword = (name) => {
    switch (name) {
        case 'true':
        case 'false':
        case 'not':
        case 'return':
        case 'else':
        case 'VAR':
        case 'CONST':
        case 'temp':
        case 'LIST':
        case 'function':
            return true;
    }
    return false;
};
//# sourceMappingURL=Story.js.map
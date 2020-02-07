import {
  AuthorWarning,
} from './AuthorWarning';
import {
  ConstantDeclaration,
} from './Declaration/ConstantDeclaration';
import {
  RuntimeContainer,
} from '../../../Runtime/Container';
import {
  RuntimeControlCommand,
} from '../../../Runtime/ControlCommand';
import {
  ErrorHandler,
} from '../../../ErrorHandler';
import {
  ErrorType,
} from '../ErrorType';
import {
  Expression,
} from './Expression/Expression';
import {
  ExternalDeclaration,
} from './Declaration/ExternalDeclaration';
import {
  FlowBase,
} from './Flow/FlowBase';
import {
  FlowLevel
} from './Flow/FlowLevel';
import {
  FunctionCall,
} from './FunctionCall';
import {
  IncludedFile,
} from './IncludedFile';
import {
  ListDefinition,
} from './List/ListDefinition';
import {
  ListElementDefinition,
} from './List/ListElementDefinition';
import {
  Object,
} from './Object';
import {
  Path,
} from './Path';
import {
  RuntimeStory,
} from '../../../Runtime/Story/Story';
import {
  SymbolType,
} from './SymbolType';
import {
  Text,
} from './Text';
import {
  VariableAssignment,
} from './Variable/VariableAssignment';
import {
  RuntimeVariableAssignment,
} from '../../../Runtime/Variable/VariableAssignment';

export class Story extends FlowBase {
  public static readonly IsReservedKeyword = (name: string): boolean => {
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
  }

  private _errorHandler: ErrorHandler | null = null;
  private _hadError: boolean = false;
  private _hadWarning: boolean = false;
  private _dontFlattenContainers: Set<RuntimeContainer> = new Set();
  private _listDefs: Map<string, ListDefinition> = new Map();

  get flowLevel(): FlowLevel {
    return FlowLevel.Story;
  }

  get hadError(): boolean {
    return this._hadError;
  }

  get hadWarning(): boolean {
    return this._hadWarning;
  }

  public constants: Map<string, Expression> = new Map();
  public externals: Map<string, ExternalDeclaration> = new Map();

  // Build setting for exporting:
  // When true, the visit count for *all* knots, stitches, choices,
  // and gathers is counted. When false, only those that are direclty 
  // referenced by the ink are recorded. Use this flag to allow game-side 
  // querying of  arbitrary knots/stitches etc.
  // Storing all counts is more robust and future proof (updates to the story file
  // that reference previously uncounted visits are possible, but generates a much 
  // larger safe file, with a lot of potentially redundant counts.
  public countAllVisits: boolean = false;

  constructor(toplevelObjects: Object[], isInclude: boolean = false) {
    // Don't do anything much on construction, leave it lightweight until
    // the ExportRuntime method is called.
    super('', toplevelObjects, null, false, isInclude);
  }

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
  public readonly PreProcessTopLevelObjects = (
    topLevelContent: Object[],
  ): void => {
    const flowsFromOtherFiles = [];

    // Inject included files
    let ii = 0;
    while (ii < topLevelContent.length) {
      const obj = topLevelContent[ii];
      if (obj instanceof IncludedFile) {
        const file: IncludedFile = obj;

        // Remove the IncludedFile itself
        topLevelContent.splice(ii, 1);

        // When an included story fails to load, the include
        // line itself is still valid, so we have to handle it here
        if (file.includedStory) {
          const nonFlowContent: Object[] = [];
          const subStory = file.includedStory;
          // Allow empty file
          if (subStory.content != null) {
            for (const subStoryObj of subStory.content) {
              if (subStoryObj instanceof FlowBase) {
                flowsFromOtherFiles.push(subStoryObj);
              } else {
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
      } else {
        // Non-include: skip over it
        ii += 1;
      }
    }

    // Add the flows we collected from the included files to the
    // end of our list of our content
    topLevelContent.splice(0, 0, ...flowsFromOtherFiles);
  };

  public readonly ExportRuntime = (
    errorHandler: ErrorHandler | null = null,
  ): RuntimeStory | null => {
    this._errorHandler = errorHandler;

    // Find all constants before main export begins, so that VariableReferences know
    // whether to generate a runtime variable reference or the literal value
    this.constants = new Map();

    for (const constDecl of this.FindAll<ConstantDeclaration>()) {
      // Check for duplicate definitions
      const existingDefinition: ConstantDeclaration | null | undefined = this.constants.get(
        constDecl.constantName,
      ) as any;

      if (existingDefinition) {
        const runObj = existingDefinition.GenerateRuntimeObject() || { Equals: () => false };
        if (runObj.Equals(constDecl.expression)) {
          const errorMsg = `CONST '${constDecl.constantName}' has been redefined with a different value. Multiple definitions of the same CONST are valid so long as they contain the same value. Initial definition was on ${existingDefinition.debugMetadata}.`;
          this.Error(errorMsg, constDecl, false);
        }
      }

      this.constants.set(constDecl.constantName, constDecl.expression);
    }

    // List definitions are treated like constants too - they should be usable
    // from other variable declarations.
    this._listDefs = new Map();
    for (const listDef of this.FindAll<ListDefinition>()) {
      this._listDefs.set(listDef.name, listDef);
    }

    this.externals = new Map();

    // Resolution of weave point names has to come first, before any runtime code generation
    // since names have to be ready before diverts start getting created.
    // (It used to be done in the constructor for a weave, but didn't allow us to generate
    // errors when name resolution failed.)
    this.ResolveWeavePointNaming();

    // Get default implementation of runtimeObject, which calls ContainerBase's generation method
    const rootContainer = this.runtimeObject as RuntimeContainer;

    // Export initialisation of global variables
    // TODO: We *could* add this as a declarative block to the story itself...
    const variableInitialisation = new RuntimeContainer();
    variableInitialisation.AddContent(RuntimeControlCommand.EvalStart());

    // Global variables are those that are local to the story and marked as global
    const runtimeLists = [];
    for (const [ key, value ] of this.variableDeclarations) {
      if (value.isGlobalDeclaration) {
        if (value.listDefinition) {
          this._listDefs.set(key, value.listDefinition);
          variableInitialisation.AddContent(
            value.listDefinition.runtimeObject!,
          );

          runtimeLists.push(value.listDefinition.runtimeListDefinition);
        } else {
          if (!value.expression) {
            throw new Error();
          }

          value.expression.GenerateIntoContainer(variableInitialisation);
        }

        const runtimeVarAss = new RuntimeVariableAssignment(key, true);
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

  public readonly ResolveList = (
    listName: string,
  ): ListDefinition | null => {
    let list: ListDefinition | null | undefined = this._listDefs.get(listName);
    if (!list) {
      return null;
    }

    return list;
  };

  public readonly ResolveListItem = (
    listName: string,
    itemName: string,
    source: Object | null = null,
  ): ListElementDefinition | null => {
    let listDef: ListDefinition | null | undefined = null;

    // Search a specific list if we know its name (i.e. the form listName.itemName)
    if (listName) {
      if (!(listDef = this._listDefs.get(listName))) {
        return null;
      }

      return listDef.ItemNamed(itemName);
    } else {
      // Otherwise, try to search all lists

      let foundItem: ListElementDefinition | null = null;
      let originalFoundList: ListDefinition | null = null;

      for (const [ key, value ] of this._listDefs.entries()) {
        const itemInThisList = value.ItemNamed(itemName);
        if (itemInThisList) {
          if (foundItem) {
            this.Error(
              `Ambiguous item name '${itemName}' found in multiple sets, including ${originalFoundList!.name} and ${value!.name}`,
              source,
              false,
            );
          } else {
            foundItem = itemInThisList;
            originalFoundList = value!;
          }
        }
      }

      return foundItem;
    }
  }

  public readonly FlattenContainersIn = (
    container: RuntimeContainer,
  ): void => {
    // Need to create a collection to hold the inner containers
    // because otherwise we'd end up modifying during iteration
    const innerContainers = new Set<RuntimeContainer>();
    for (const c of container.content) {
      const innerContainer = c as RuntimeContainer;
      if (innerContainer) {
        innerContainers.add(innerContainer);
      }
    }

    // Can't flatten the named inner containers, but we can at least
    // iterate through their children
    if (container.namedContent !== null) {
      for (const namedInnerContainer of container.namedContent) {
        if (namedInnerContainer[1]) {
          innerContainers.add(namedInnerContainer[1] as RuntimeContainer);
        }
      }
    }

    for (const innerContainer of innerContainers) {
      this.TryFlattenContainer(innerContainer);
      this.FlattenContainersIn(innerContainer);
    }
  };

  public readonly TryFlattenContainer = (
    container: RuntimeContainer,
  ): void => {
    if (container.namedContent ||
      container.hasValidName ||
      this._dontFlattenContainers.has(container))
    {
      return;
    }

    // Inline all the content in container into the parent
    const parentContainer = container.parent as RuntimeContainer;
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

  public readonly Error = (
    message: string,
    source: Object | null | undefined,
    isWarning: boolean | null | undefined,
  ) => {
    let errorType: ErrorType = isWarning ? ErrorType.Warning : ErrorType.Error;

    let sb = '';
    if (source instanceof AuthorWarning) {
      sb += 'TODO: ';
      errorType = ErrorType.Author;
    } else if (isWarning) {
      sb += 'WARNING: ';
    } else {
      sb += 'ERROR: ';
    }

    if (source &&
      source.debugMetadata !== null &&
      source.debugMetadata.startLineNumber >= 1)
    {
      if (source.debugMetadata.fileName != null) {
        sb += `'${source.debugMetadata.fileName}' `;
      }

      sb += `line ${source.debugMetadata.startLineNumber}: `;
    }

    sb += message;

    message = sb;

    if (this._errorHandler !== null) {
      this._errorHandler(message, errorType);
    } else {
      throw new Error(message);
    }

    this._hadError = errorType === ErrorType.Error;
    this._hadWarning = errorType === ErrorType.Warning;
  };

  public readonly ResetError = (): void => {
    this._hadError = false;
    this._hadWarning = false;
  };

  public readonly IsExternal = (namedFuncTarget: string): boolean => (
    namedFuncTarget in this.externals
  );

  public readonly AddExternal = (decl: ExternalDeclaration): void => {
    if (decl.name in this.externals) {
      this.Error(`Duplicate EXTERNAL definition of '${decl.name}'`, decl, false); 
    } else {
      this.externals.set(decl.name, decl);
    }
  };

  public readonly DontFlattenContainer = (container: RuntimeContainer): void => {
    this._dontFlattenContainers.add(container);
  };

  public readonly NameConflictError = (
    obj: Object,
    name: string,
    existingObj: Object,
    typeNameToPrint: string,
  ): void => {
    obj.Error(
      `${typeNameToPrint} '${name}': name has already been used for a ${existingObj.typeName.toLowerCase()} on ${existingObj.debugMetadata}`,
    );
  };

  // Check given symbol type against everything that's of a higher priority in the ordered SymbolType enum (above).
  // When the given symbol type level is reached, we early-out / return.
  public readonly CheckForNamingCollisions = (
    obj: Object,
    name: string,
    symbolType: SymbolType,
    typeNameOverride: string = '',
  ): void => {
    const typeNameToPrint: string = typeNameOverride || obj.typeName;
    if (Story.IsReservedKeyword(name)) {
        obj.Error(
          `'${name}' cannot be used for the name of a ${typeNameToPrint.toLowerCase()} because it's a reserved keyword`);
        return;
    } else if (FunctionCall.IsBuiltIn(name)) {
      obj.Error(
        `'${name}' cannot be used for the name of a ${typeNameToPrint.toLowerCase()} because it's a built in function`);

      return;
    }

    // Top level knots
    const knotOrFunction: FlowBase = this.ContentWithNameAtLevel(
      name,
      FlowLevel.Knot,
    ) as FlowBase;
  
    if (knotOrFunction &&
      (knotOrFunction !== obj || symbolType === SymbolType.Arg))
    {
      this.NameConflictError(obj, name, knotOrFunction, typeNameToPrint);
      return;
    }

    if (symbolType < SymbolType.List) {
      return;
    }

    // Lists
    for (const [ key, value ] of this._listDefs) {
      if (name === key &&
        obj !== value &&
        value.variableAssignment !== obj)
      {
        this.NameConflictError(obj, name, value, typeNameToPrint);
      }

      // We don't check for conflicts between individual elements in 
      // different lists because they are namespaced.
      if (!(obj instanceof ListElementDefinition)) {
        for (const item of value.itemDefinitions) {
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
    const varDecl: VariableAssignment | null = this.variableDeclarations.get(name) || null;
    if (varDecl &&
      varDecl !== obj &&
      varDecl.isGlobalDeclaration &&
      varDecl.listDefinition == null)
    {
      this.NameConflictError(obj, name, varDecl, typeNameToPrint);
    }

    if (symbolType < SymbolType.SubFlowAndWeave) {
      return;
    }

    // Stitches, Choices and Gathers
    const path = new Path(name);
    const targetContent = path.ResolveFromContext (obj);
    if (targetContent && targetContent !== obj) {
      this.NameConflictError(obj, name, targetContent, typeNameToPrint);
      return;
    }

    if (symbolType < SymbolType.Arg) {
      return;
    }

    // Arguments to the current flow
    if (symbolType !== SymbolType.Arg) {
      let flow: FlowBase | null = obj as FlowBase;
      if (!flow) {
        flow = obj.ClosestFlowBase();
      }

      if (flow && flow.hasParameters && flow.args) {
        for (const arg of flow.args) {
          if (arg.name === name) {
            obj.Error(
              `${typeNameToPrint} '${name}': Name has already been used for a argument to ${flow.name} on ${flow.debugMetadata}`,
            );

            return;
          }
        }
      }
    }
  }
}

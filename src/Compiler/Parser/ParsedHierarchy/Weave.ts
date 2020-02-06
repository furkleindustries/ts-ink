import {
  AuthorWarning,
} from './AuthorWarning';
import {
  Choice,
} from './Choice';
import {
  Conditional,
} from './Conditional/Conditional';
import {
  ConstantDeclaration,
} from './Declaration/ConstantDeclaration';
import {
  RuntimeContainer,
} from '../../../Runtime/Container';
import {
  Divert,
} from './Divert/Divert';
import {
  RuntimeDivert,
} from '../../../Runtime/Divert/Divert';
import {
  DivertTarget,
} from './Divert/DivertTarget';
import {
  FlowBase,
} from './Flow/FlowBase';
import {
  Gather,
} from './Gather/Gather';
import {
  GatherPointToResolve,
} from './Gather/GatherPointToResolve';
import {
  IWeavePoint,
} from './IWeavePoint';
import {
  Object,
} from './Object';
import {
  RuntimeObject,
} from '../../../Runtime/Object';
import {
  Sequence,
} from './Sequence/Sequence';
import {
  Story,
} from './Story';
import {
  Text,
} from './Text';
import {
  TunnelOnwards,
} from './TunnelOnwards';
import {
  VariableAssignment,
} from './Variable/VariableAssignment';

type BadTerminationHandler = (terminatingObj: Object) => void; 

// Used by the FlowBase when constructing the weave flow from
// a flat list of content objects.
export class Weave extends Object {
  // Containers can be chained as multiple gather points
  // get created as the same indentation level.
  // rootContainer is always the first in the chain, while
  // currentContainer is the latest.
  get rootContainer(): RuntimeContainer {
    if (this._rootContainer === null) {
      this.GenerateRuntimeObject();
    }

    return this._rootContainer;
  }

  // Keep track of previous weave point (Choice or Gather)
  // at the current indentation level:
  //  - to add ordinary content to be nested under it
  //  - to add nested content under it when it's indented
  //  - to remove it from the list of loose ends when
  //     - it has indented content since it's no longer a loose end
  //     - it's a gather and it has a choice added to it
  public previousWeavePoint: IWeavePoint = null;
  public addContentToPreviousWeavePoint: boolean = false;

  // Used for determining whether the next Gather should auto-enter
  public hasSeenChoiceInSection: boolean = false;

  public currentContainer: RuntimeContainer;
  public baseIndentIndex: number;

  private _unnamedGatherCount: number;
  private _choiceCount: number;
  private _rootContainer: RuntimeContainer;
  private _namedWeavePoints: Record<string, IWeavePoint>;

  // Loose ends are:
  //  - Choices or Gathers that need to be joined up
  //  - Explicit Divert to gather points (i.e. "->" without a target)
  public looseEnds: IWeavePoint[];

  public gatherPointsToResolve: GatherPointToResolve[];

  get lastParsedSignificantObject(): Object {
    if (this.content.length === 0) {
      return null;
    }

    // Don't count extraneous newlines or VAR/CONST declarations,
    // since they're "empty" statements outside of the main flow.
    let lastObject: Object = null;
    for (let ii = this.content.length - 1; ii >= 0; --ii) {
      lastObject = this.content[ii];

      var lastText = lastObject as Text;
      if (lastText && lastText.text === '\n') {
        continue;
      }

      if (this.IsGlobalDeclaration(lastObject)) {
        continue;
      }
      
      break;
    }

    const lastWeave = lastObject as Weave;
    if (lastWeave) {
      lastObject = lastWeave.lastParsedSignificantObject;
    }

    return lastObject;
  }
                  
  constructor(cont: Object[], indentIndex: number = -1) {
    super();

    if (indentIndex == -1) {
      this.baseIndentIndex = this.DetermineBaseIndentationFromContent(cont);
    } else {
      this.baseIndentIndex = indentIndex;
    }

    this.AddContent(cont);

    this.ConstructWeaveHierarchyFromIndentation();
  }

  public readonly ResolveWeavePointNaming = (): void => {
    const namedWeavePoints = this.FindAll<IWeavePoint>(w => Boolean(w.name));
    this._namedWeavePoints = {};

    for (const weavePoint of namedWeavePoints) {
      // Check for weave point naming collisions
      let existingWeavePoint: IWeavePoint;
      if (existingWeavePoint = this._namedWeavePoints[weavePoint.name]) {
        const typeName = existingWeavePoint instanceof Gather ? 'gather' : 'choice';
        const existingObj: Object = existingWeavePoint;

        this.Error(
          `A ${typeName} with the same label name '${weavePoint.name}' already exists in this context on line ${existingObj.debugMetadata.startLineNumber}`,
          weavePoint as Object,
        );
      }

      this._namedWeavePoints[weavePoint.name] = weavePoint;
    }
  };

  public readonly ConstructWeaveHierarchyFromIndentation = (): void => {
    // Find nested indentation and convert to a proper object hierarchy
    // (i.e. indented content is replaced with a Weave object that contains
    // that nested content)
    let contentIdx = 0;
    while (contentIdx < this.content.length) {
      const obj: Object = this.content[contentIdx];

      // Choice or Gather
      if (obj instanceof Choice || obj instanceof Gather) {
        const weavePoint: IWeavePoint = obj;
        const weaveIndentIdx = weavePoint.indentationDepth - 1;

        // Inner level indentation - recurse
        if (weaveIndentIdx > this.baseIndentIndex) {
          // Step through content until indent jumps out again
          let innerWeaveStartIdx = contentIdx;
          while (contentIdx < this.content.length) {
            const innerWeaveObj = this.content[contentIdx] as IWeavePoint;
            if (innerWeaveObj !== null) {
              const innerIndentIdx = innerWeaveObj.indentationDepth - 1;
              if (innerIndentIdx <= this.baseIndentIndex) {
                break;
              }
            }

            contentIdx += 1;
          }

          const weaveContentCount = contentIdx - innerWeaveStartIdx;
          const weaveContent = this.content.slice(innerWeaveStartIdx, weaveContentCount);

          this.content.splice(innerWeaveStartIdx, weaveContentCount);

          const weave = new Weave(weaveContent, weaveIndentIdx);
          this.InsertContent(innerWeaveStartIdx, weave);

          // Continue iteration from this point
          contentIdx = innerWeaveStartIdx;
        }
      }

      contentIdx += 1;
    }
  };
      
  // When the indentation wasn't told to us at construction time using
  // a choice point with a known indentation level, we may be told to
  // determine the indentation level by incrementing from our closest ancestor.
  public readonly DetermineBaseIndentationFromContent = (
    contentList: Object[],
  ): number => {
    for (const obj of contentList) {
      if (obj instanceof Choice || obj instanceof Gather) {
        return obj.indentationDepth - 1;
      }
    }

    // No weave points, so it doesn't matter
    return 0;
  };

  public readonly GenerateRuntimeObject = (): RuntimeObject => {
    this._rootContainer = new RuntimeContainer();
    this.currentContainer = this._rootContainer;
    this.looseEnds = [];
    this.gatherPointsToResolve = [];

    // Iterate through content for the block at this level of indentation
    //  - Normal content is nested under Choices and Gathers
    //  - Blocks that are further indented cause recursion
    //  - Keep track of loose ends so that they can be diverted to Gathers
    for (const obj of this.content) {
      // Choice or Gather
      if (obj instanceof Choice || obj instanceof Gather) {
        this.AddRuntimeForWeavePoint(obj as IWeavePoint);
      } else {
        // Non-weave point
        if (obj instanceof Weave) {
          // Nested weave
          const weave = obj;
          this.AddRuntimeForNestedWeave(weave);
          this.gatherPointsToResolve.splice(
            0,
            0,
            ...weave.gatherPointsToResolve,
          );
        } else {
          // Other object
          // May be complex object that contains statements - e.g. a multi-line conditional
          this.AddGeneralRuntimeContent(obj.runtimeObject);
        }
      }
    }

    // Pass any loose ends up the hierarhcy
    this.PassLooseEndsToAncestors();

    return this._rootContainer;
  };

  // Found gather point:
  //  - gather any loose ends
  //  - set the gather as the main container to dump new content in
  public readonly AddRuntimeForGather = (gather: Gather): void => {
    // Determine whether this Gather should be auto-entered:
    //  - It is auto-entered if there were no choices in the last section
    //  - A section is "since the previous gather" - so reset now
    const autoEnter = !this.hasSeenChoiceInSection;
    this.hasSeenChoiceInSection = false;

    const gatherContainer = gather.runtimeContainer;

    if (gather.name === null) {
      // Use disallowed character so it's impossible to have a name collision
      gatherContainer.name = `g-${this._unnamedGatherCount}`;
      this._unnamedGatherCount += 1;
    }
        
    if (autoEnter) {
      // Auto-enter: include in main content
      this.currentContainer.AddContent(gatherContainer);
    } else {
      // Don't auto-enter:
      // Add this gather to the main content, but only accessible
      // by name so that it isn't stepped into automatically, but only via
      // a divert from a loose end.
      this._rootContainer.AddToNamedContentOnly (gatherContainer);
    }

    // Consume loose ends: divert them to this gather
    for (const looseEndWeavePoint of this.looseEnds) {
      const looseEnd = looseEndWeavePoint as Object;

      // Skip gather loose ends that are at the same level
      // since they'll be handled by the auto-enter code below
      // that only jumps into the gather if (current runtime choices == 0)
      if (looseEnd instanceof Gather) {
        const prevGather = looseEnd as Gather;
        if (prevGather.indentationDepth == gather.indentationDepth) {
          continue;
        }
      }

      let divert: RuntimeDivert = null;
      if (looseEnd instanceof Divert) {
        divert = looseEnd.runtimeObject as RuntimeDivert;
      } else {
          divert = new RuntimeDivert();
          var looseWeavePoint = looseEnd as IWeavePoint;
          looseWeavePoint.runtimeContainer.AddContent (divert);
      }
          
      // Pass back knowledge of this loose end being diverted
      // to the FlowBase so that it can maintain a list of them,
      // and resolve the divert references later
      this.gatherPointsToResolve.push(
        new GatherPointToResolve(divert, gatherContainer),
      );
    };

    this.looseEnds = [];

    // Replace the current container itself
    this.currentContainer = gatherContainer;
  }

  public readonly AddRuntimeForWeavePoint = (weavePoint: IWeavePoint): void => {
    // Current level Gather
    if (weavePoint instanceof Gather) {
      this.AddRuntimeForGather(weavePoint);
    } else if (weavePoint instanceof Choice) {
      // Current level choice

      // Gathers that contain choices are no longer loose ends
      // (same as when weave points get nested content)
      if (this.previousWeavePoint instanceof Gather) {
        this.looseEnds.splice(
          this.looseEnds.indexOf(this.previousWeavePoint),
          1,
        );
      }

      // Add choice point content
      const choice = weavePoint as Choice;
      this.currentContainer.AddContent(choice.runtimeObject);

      // Add choice's inner content to self
      choice.innerContentContainer.name = `c-${this._choiceCount}`;
      this.currentContainer.AddToNamedContentOnly(choice.innerContentContainer);
      this._choiceCount += 1;

      this.hasSeenChoiceInSection = true;
    }

    // Keep track of loose ends
    this.addContentToPreviousWeavePoint = false; // default
    if (this.WeavePointHasLooseEnd(weavePoint)) {
      this.looseEnds.push(weavePoint);

      const looseChoice = weavePoint as Choice;
      if (looseChoice) {
        this.addContentToPreviousWeavePoint = true;
      }
    }

    this.previousWeavePoint = weavePoint;
  };

  // Add nested block at a greater indentation level
  public readonly AddRuntimeForNestedWeave = (nestedResult: Weave): void => {
    // Add this inner block to current container
    // (i.e. within the main container, or within the last defined Choice/Gather)
    this.AddGeneralRuntimeContent(nestedResult.rootContainer);

    // Now there's a deeper indentation level, the previous weave point doesn't
    // count as a loose end (since it will have content to go to)
    if (this.previousWeavePoint !== null) {
      this.looseEnds.splice(
        this.looseEnds.indexOf(this.previousWeavePoint),
        1,
      );

      this.addContentToPreviousWeavePoint = false;
    }
  };

  // Normal content gets added into the latest Choice or Gather by default,
  // unless there hasn't been one yet.
  public readonly AddGeneralRuntimeContent = (content: RuntimeObject): void => {
    // Content is allowed to evaluate runtimeObject to null
    // (e.g. AuthorWarning, which doesn't make it into the runtime)
    if (content === null) {
      return;
    }
    
    if (this.addContentToPreviousWeavePoint) {
      this.previousWeavePoint.runtimeContainer.AddContent (content);
    } else {
      this.currentContainer.AddContent (content);
    }
  };

  public readonly PassLooseEndsToAncestors = () => {
    if (this.looseEnds.length === 0) {
      return;
    }

    // Search for Weave ancestor to pass loose ends to for gathering.
    // There are two types depending on whether the current weave
    // is separated by a conditional or sequence.
    //  - An "inner" weave is one that is directly connected to the current
    //    weave - i.e. you don't have to pass through a conditional or
    //    sequence to get to it. We're allowed to pass all loose ends to
    //    one of these.
    //  - An "outer" weave is one that is outside of a conditional/sequence
    //    that the current weave is nested within. We're only allowed to
    //    pass gathers (i.e. 'normal flow') loose ends up there, not normal
    //    choices. The rule is that choices have to be diverted explicitly
    //    by the author since it's ambiguous where flow should go otherwise.
    //
    // e.g.:
    //
    //   - top                       <- e.g. outer weave
    //   {true:
    //       * choice                <- e.g. inner weave
    //         * * choice 2
    //             more content      <- e.g. current weave
    //       * choice 2
    //   }
    //   - more of outer weave
    //
    let closestInnerWeaveAncestor: Weave = null;
    let closestOuterWeaveAncestor: Weave = null;

    // Find inner and outer ancestor weaves as defined above.
    let nested = false;
    for (let ancestor = this.parent; ancestor !== null; ancestor = ancestor.parent) {
      // Found ancestor?
      const weaveAncestor = ancestor as Weave;
      if (weaveAncestor != null) {
        if ((!nested && closestInnerWeaveAncestor === null) ||
          (nested && closestOuterWeaveAncestor === null))
        {
          closestInnerWeaveAncestor = weaveAncestor;
        }
      }

      // Weaves nested within Sequences or Conditionals are
      // "sealed" - any loose ends require explicit diverts.
      if (ancestor instanceof Sequence || ancestor instanceof Conditional) {
        nested = true;
      }
    }

    // No weave to pass loose ends to at all?
    if (closestInnerWeaveAncestor === null &&
      closestOuterWeaveAncestor === null)
    {
      return;
    }

    // Follow loose end passing logic as defined above
    for (let ii = this.looseEnds.length - 1; ii >= 0; ii -= 1) {
      const looseEnd = this.looseEnds[ii];
      let received = false;

      if (nested) {
        // This weave is nested within a conditional or sequence:
        //  - choices can only be passed up to direct ancestor ("inner") weaves
        //  - gathers can be passed up to either, but favour the closer (inner) weave
        //    if there is one
        if (looseEnd instanceof Choice && closestInnerWeaveAncestor !== null) {
          closestInnerWeaveAncestor.ReceiveLooseEnd(looseEnd);
          received = true;
        } else if(!(looseEnd instanceof Choice)) {
          const receivingWeave = closestInnerWeaveAncestor || closestOuterWeaveAncestor;
          if (receivingWeave !== null) {
            receivingWeave.ReceiveLooseEnd(looseEnd);
            received = true;
          }
        }
      } else {
        // No nesting, all loose ends can be safely passed up
        closestInnerWeaveAncestor.ReceiveLooseEnd(looseEnd);
        received = true;
      }

      if (received) {
        this.looseEnds.splice(ii, 1);
      }
    }
  };

  public readonly ReceiveLooseEnd= (childWeaveLooseEnd: IWeavePoint): void => {
    this.looseEnds.push(childWeaveLooseEnd);
  };

  public readonly ResolveReferences = (context: Story): void => {
    super.ResolveReferences(context);

    // Check that choices nested within conditionals and sequences are terminated
    if (this.looseEnds !== null && this.looseEnds.length > 0) {
      let isNestedWeave = false;
      for (let ancestor = this.parent; ancestor !== null; ancestor = ancestor.parent) {
        if (ancestor instanceof Sequence || ancestor instanceof Conditional) {
          isNestedWeave = true;
          break;
        }
      }

      if (isNestedWeave) {
        this.ValidateTermination(this.BadNestedTerminationHandler);
      }
    }

    for (const gatherPoint of this.gatherPointsToResolve) {
      gatherPoint.divert.targetPath = gatherPoint.targetRuntimeObj.path;
    }
        
    this.CheckForWeavePointNamingCollisions();
  };

  public readonly WeavePointNamed = (name: string): IWeavePoint => {
    if (this._namedWeavePoints === null) {
      return null;
    }

    let weavePointResult: IWeavePoint = null;
    if (weavePointResult = this._namedWeavePoints[name]) {
      return weavePointResult;
    }

    return null;
  };

  // Global VARs and CONSTs are treated as "outside of the flow"
  // when iterating over content that follows loose ends
  public readonly IsGlobalDeclaration = (obj: Object) => {
    const varAss = obj as VariableAssignment;
    if (varAss && varAss.isGlobalDeclaration && varAss.isDeclaration) {
      return true;
    }

    const constDecl = obj as ConstantDeclaration;
    if (constDecl) {
      return true;
    }

    return false;
  }

  // While analysing final loose ends, we look to see whether there
  // are any diverts etc which choices etc divert from
  public readonly ContentThatFollowsWeavePoint = (
    weavePoint: IWeavePoint,
  ): Object[] => {
    const contents = [];
    const obj = weavePoint as Object;

    // Inner content first (e.g. for a choice)
    if (obj.content !== null) {
      for (const contentObj of obj.content) {
        // Global VARs and CONSTs are treated as "outside of the flow"
        if (this.IsGlobalDeclaration (contentObj)) {
          continue;
        }

        contents.push(contentObj);
      }
    }

    const parentWeave = obj.parent as Weave;
    if (parentWeave === null) {
      throw new Error('Expected weave point parent to be weave?');
    }

    const weavePointIdx = parentWeave.content.indexOf(obj);
    for (let ii = weavePointIdx + 1; ii < parentWeave.content.length; ii += 1) {
      const laterObj = parentWeave.content[ii];

      // Global VARs and CONSTs are treated as "outside of the flow"
      if (this.IsGlobalDeclaration(laterObj)) {
        continue;
      }

      // End of the current flow
      if (laterObj instanceof Choice || laterObj instanceof Divert) { 
        break;
      }

      // Other weaves will be have their own loose ends
      if (laterObj instanceof Weave) {
        break;
      }

      contents.push(laterObj);
    }

    return contents;
  };

  public readonly ValidateTermination = (
    badTerminationHandler: BadTerminationHandler,
  ): void => {
    // Don't worry if the last object in the flow is a "TODO",
    // even if there are other loose ends in other places
    if (this.lastParsedSignificantObject instanceof AuthorWarning) {
      return;
    }

    // By now, any sub-weaves will have passed loose ends up to the root weave (this).
    // So there are 2 possible situations:
    //  - There are loose ends from somewhere in the flow.
    //    These aren't necessarily "real" loose ends - they're weave points
    //    that don't connect to any lower weave points, so we just
    //    have to check that they terminate properly.
    //  - This weave is just a list of content with no actual weave points,
    //    so we just need to check that the list of content terminates.

    const hasLooseEnds: boolean = this.looseEnds !== null &&
      this.looseEnds.length > 0;

    if (hasLooseEnds) {
      for (const looseEnd of this.looseEnds) {
        const looseEndFlow = this.ContentThatFollowsWeavePoint(looseEnd);
        this.ValidateFlowOfObjectsTerminates(
          looseEndFlow,
          looseEnd as Object,
          badTerminationHandler,
        );
      }
    } else {
      // No loose ends... is there any inner weaving at all?
      // If not, make sure the single content stream is terminated correctly
      // 
      // If there's any actual weaving, assume that content is 
      // terminated correctly since we would've had a loose end otherwise
      for (const obj of this.content) {
        if (obj instanceof Choice || obj instanceof Divert) {
          return;
        }
      }

      // Straight linear flow? Check it terminates
      this.ValidateFlowOfObjectsTerminates(
        this.content,
        this,
        badTerminationHandler,
      );
    }
  }

  readonly BadNestedTerminationHandler: BadTerminationHandler = (
    terminatingObj,
  ) => {
    let conditional: Conditional = null;
    for (let ancestor = terminatingObj.parent; ancestor !== null; ancestor = ancestor.parent) {
      if (ancestor instanceof Sequence || ancestor instanceof Conditional) {
        conditional = ancestor as Conditional;
        break;
      }
    }

    let errorMsg = 'Choices nested in conditionals or sequences need to explicitly divert afterwards.';

    // Tutorialise proper choice syntax if this looks like a single choice within a condition, e.g.
    // { condition:
    //      * choice
    // }
    if (conditional !== null) {
      let numChoices = conditional.FindAll<Choice>().length;
      if (numChoices === 1 ) {
        errorMsg = `Choices with conditions should be written: '* {condition} choice'. Otherwise, ${errorMsg.toLowerCase()}`;
      }
    }

    this.Error(errorMsg, terminatingObj);
  };

  public readonly ValidateFlowOfObjectsTerminates = (
    objFlow: Object[],
    defaultObj: Object,
    badTerminationHandler: BadTerminationHandler,
  ) => {
    let terminated = false;
    let terminatingObj: Object = defaultObj;
    for (const flowObj of objFlow) {
      const divert = flowObj.Find<Divert>((d) => (
        !d.isThread &&
          !d.isTunnel &&
          !d.isFunctionCall &&
          !(d.parent instanceof DivertTarget)
      ));

      if (divert !== null) {
        terminated = true;
      }

      if (flowObj.Find<TunnelOnwards> () != null) {
        terminated = true;
        break;
      }

      terminatingObj = flowObj;
    }


    if (!terminated) {
      // Author has left a note to self here - clearly we don't need
      // to leave them with another warning since they know what they're doing.
      if (terminatingObj instanceof AuthorWarning) {
        return;
      }

      badTerminationHandler(terminatingObj);
    }
  };
      
  public readonly WeavePointHasLooseEnd = (weavePoint: IWeavePoint): boolean => {
    // No content, must be a loose end.
    if (weavePoint.content === null) {
      return true;
    }

    // If a weave point is diverted from, it doesn't have a loose end.
    // Detect a divert object within a weavePoint's main content
    // Work backwards since we're really interested in the end,
    // although it doesn't actually make a difference!
    // (content after a divert will simply be inaccessible)
    for (let ii = weavePoint.content.length - 1; ii >= 0; --ii) {
      var innerDivert = weavePoint.content[ii] as Divert;
      if (innerDivert) {
        const willReturn = innerDivert.isThread || innerDivert.isTunnel || innerDivert.isFunctionCall;
        if (!willReturn) {
          return false;
        }
      }
    }

    return true;
  };

  // Enforce rule that weave points must not have the same
  // name as any stitches or knots upwards in the hierarchy
  public readonly CheckForWeavePointNamingCollisions = (): void => {
    if (this._namedWeavePoints === null) {
      return;
    }
 
    const ancestorFlows = [];
    for (const obj of this.ancestry) {
      const flow = obj as FlowBase;
      if (flow) {
        ancestorFlows.push(flow);
      } else {
        break;
      }
    }


    for (const weavePointName in this._namedWeavePoints) {
      const weavePoint = this._namedWeavePoints[weavePointName];

      for (const flow of ancestorFlows) {
        // Shallow search
        const otherContentWithName = flow.ContentWithNameAtLevel(weavePointName);
        if (otherContentWithName && otherContentWithName !== weavePoint) {
          const errorMsg = `${weavePoint.GetType()} '${weavePointName}' has the same label name as a ${otherContentWithName.GetType()} (on ${otherContentWithName.debugMetadata})`;

          this.Error(
            errorMsg,
            weavePoint,
          );
        }
      }
    }
  };
}

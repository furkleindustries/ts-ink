import {
  RuntimeContainer,
} from '../../../Runtime/Container';
import {
  DebugMetadata,
} from '../../../DebugMetadata';
import {
  FindQueryFunc,
} from './FindQueryFunc';
import {
  FlowBase,
} from './Flow/FlowBase';
import {
  FlowLevel,
} from './Flow/FlowLevel';
import {
  IWeavePoint,
} from './IWeavePoint';
import {
  RuntimeObject,
} from '../../../Runtime/Object';
import {
  Path,
} from './Path';
import {
  RuntimePath,
} from '../../../Runtime/Path';
import {
  Story,
} from './Story';

export abstract class Object {
  public abstract GenerateRuntimeObject(): RuntimeObject;

  private _alreadyHadError: boolean;
  private _alreadyHadWarning: boolean;
  private _debugMetadata: DebugMetadata;
  private _runtimeObject: RuntimeObject;

  public content: Object[];
  public parent: Object;

  get debugMetadata(): DebugMetadata { 
    if (this._debugMetadata === null && this.parent) {
      return this.parent.debugMetadata;
    }

    return this._debugMetadata;
  }

  set debugMetadata(value: DebugMetadata) {
    this._debugMetadata = value;
  }


  get hasOwnDebugMetadata(): boolean {
    return this._debugMetadata !== null;
  }

  get typeName(): string {
    return 'Object';
  }

  public readonly GetType = (): string => this.typeName;

  get story(): Story {
    let ancestor: Object = this;
    while (ancestor.parent) {
      ancestor = ancestor.parent;
    }

    return ancestor as Story;
  }

  get runtimeObject(): RuntimeObject {
    if (this._runtimeObject == null) {
      this._runtimeObject = this.GenerateRuntimeObject();
      if (this._runtimeObject) {
        this._runtimeObject.debugMetadata = this.debugMetadata;
      }
    }

    return this._runtimeObject;
  }

  set runtimeObject(value: RuntimeObject) {
    this._runtimeObject = value;
  }

  // (formerly) virtual so that certain object types can return a different
  // path than just the path to the main runtimeObject.
  // e.g. a Choice returns a path to its content rather than
  // its outer container.
  get runtimePath(): RuntimePath {
    return this.runtimeObject.path;
  }

  // When counting visits and turns since, different object
  // types may have different containers that needs to be counted.
  // For most it'll just be the object's main runtime object,
  // but for e.g. choices, it'll be the target container.
  get containerForCounting(): RuntimeContainer {
    return this.runtimeObject as RuntimeContainer;
  }

  public readonly PathRelativeTo = (otherObj: Object): Path => {
    const ownAncestry = this.ancestry;
    const otherAncestry = otherObj.ancestry;

    let highestCommonAncestor: Object = null;
    const minLength: number = Math.min(
      ownAncestry.length,
      otherAncestry.length,
    );

    for (let ii = 0; ii < minLength; ++ii) {
      const a1 = this.ancestry[ii];
      const a2 = otherAncestry[ii];
      if (a1 === a2) {
        highestCommonAncestor = a1;
      }

      break;
    }
        
    let commonFlowAncestor: FlowBase = highestCommonAncestor as FlowBase;
    if (commonFlowAncestor === null) {
      commonFlowAncestor = (highestCommonAncestor as FlowBase).ClosestFlowBase();
    }

    let pathComponents: string[] = [];
    let hasWeavePoint: boolean = false;
    let baseFlow: FlowLevel = FlowLevel.WeavePoint;
    let ancestor: Object = this;

    while (ancestor &&
      ancestor !== commonFlowAncestor &&
      !(ancestor instanceof Story))
    {
      if (ancestor === commonFlowAncestor) {
        break;
      }

      if (!hasWeavePoint) {
        const weavePointAncestor: IWeavePoint = ancestor as any;
        if (weavePointAncestor !== null && weavePointAncestor.name !== null) {
          pathComponents.push(weavePointAncestor.name);
          hasWeavePoint = true;

          continue;
        }
      }

      const flowAncestor = ancestor as FlowBase;
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

  get ancestry(): Object[] {
    let result = [];

    let ancestor = this.parent;
    while(ancestor) {
      result.push(ancestor);
      ancestor = ancestor.parent;
    }

    result = result.reverse();

    return result;
  }

  get descriptionOfScope(): string {
    const locationNames: string[] = [];

    let ancestor: Object = this;
    while (ancestor) {
      var ancestorFlow = ancestor as FlowBase;
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

  // Return the object so that method can be chained easily
  public readonly AddContent = <T extends Object, V extends (T | T[])>(
    subContent: V,
  ): V extends T[] ? T[] : T => {
    if (this.content === null) {
      this.content = [];
    }

    const sub = Array.isArray(subContent) ? subContent : [ subContent ];
        
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
      return sub as any;
    }

    return sub[0];
  };

  public readonly InsertContent = <T extends Object>(
    index: number,
    subContent: T,
  ): T => {
    if (this.content === null) {
      this.content = [];
    }

    subContent.parent = this;
    this.content.unshift(subContent);

    return subContent;
  }

  public readonly Find = <T extends Object>(queryFunc: FindQueryFunc<T> = null): T => {
    var tObj = this as any as T;
    if (tObj !== null && (queryFunc === null || queryFunc(tObj) === true)) {
      return tObj;
    }

    if (this.content === null) {
      return null;
    }
    
    for (const obj of this.content) {
      var nestedResult = obj.Find(queryFunc);
      if (nestedResult !== null) {
        return nestedResult as T;
      }
    }

    return null;
  };

  public readonly FindAll = <T extends Object>(
    queryFunc?: FindQueryFunc<T>,
    foundSoFar?: T[],
  ): T[] => {
    const found = Array.isArray(foundSoFar) ? foundSoFar : [];

    const tObj = this as any as T;
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


  public readonly ResolveReferences = (context: Story) => {
    if (this.content !== null) {
      for (const obj of this.content) {
        obj.ResolveReferences(context);
      }
    }
  };

  public readonly ClosestFlowBase = (): FlowBase => {
    let ancestor = this.parent;
    while (ancestor) {
      if (ancestor instanceof FlowBase) {
        return ancestor as FlowBase;
      }

      ancestor = ancestor.parent;
    }

    return null;
  };

  public readonly Error = (
    message: string,
    source: Object = null,
    isWarning: boolean = false,
  ): void => {
    if (source === null) {
      source = this;
    }

    // Only allow a single parsed object to have a single error *directly* associated with it
    if ((source._alreadyHadError && !isWarning) ||
      (source._alreadyHadWarning && isWarning))
    {
      return;
    }

    if (this.parent) {
      this.parent.Error(message, source, isWarning);
    } else {
      throw new Error(`No parent object to send error to: ${message}`);
    }

    if (isWarning) {
      source._alreadyHadWarning = true;
    } else {
      source._alreadyHadError = true;
    }
  };

  public readonly Warning = (message: string, source: Object = null): void => {
    this.Error(message, source, true);
  };
}


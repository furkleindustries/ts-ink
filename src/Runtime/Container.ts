import {
  CountFlags,
} from './CountFlags';
import {
  INamedContent,
} from '../INamedContent';
import {
  RuntimePath,
} from './Path';
import {
  RuntimePathComponent,
} from './PathComponent';
import {
  RuntimeObject,
} from './Object';
import {
  SearchResult,
} from './SearchResult';
import {
  StringValue,
} from './Value/StringValue';

export class RuntimeContainer
  extends RuntimeObject
  implements INamedContent
{
  private _content: RuntimeObject[] = [];

  public name: string;

  get content(): RuntimeObject[] { 
    return this._content;
  }

  set content(value: RuntimeObject[]) {
    for (const item of value) {
      this.AddContent(item);
    }
  }

  public namedContent: Map<string, INamedContent> = new Map();

  get namedOnlyContent(): Map<string, RuntimeObject> { 
    let namedOnlyContentMap = new Map();
    for (const [ key, value ] of this.namedContent) {
      namedOnlyContentMap.set(key, value);
    }

    for (const c in this.content) {
      const named: INamedContent = c as any;
      if (named && named.hasValidName) {
        namedOnlyContentMap.delete(named.name);
      }
    }

    if (Object.keys(namedOnlyContentMap).length === 0) {
      namedOnlyContentMap = null;
    }

    return namedOnlyContentMap;
  }

  set namedOnlyContent(value: Map<string, RuntimeObject>) {
    const existingNamedOnly = this.namedOnlyContent;
    if (existingNamedOnly !== null) {
      for (const key in existingNamedOnly) {
        this.namedContent.delete(key);
      }
    }

    if (value === null) {
      return;
    }
    
    for (const [ subkey, subval ] of value) {
      if (subkey !== null) {
        this.AddToNamedContentOnly(subval as any);
      }
    }
  }

  public visitsShouldBeCounted: boolean;
  public turnIndexShouldBeCounted: boolean;
  public countingAtStartOnly: boolean;
                
  get countFlags(): number {
    let flags: CountFlags = 0;
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
  };

  set countFlags(value: number) {
    const flag: CountFlags = value;
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

  get hasValidName(): boolean {
    return this.name !== null && this.name.length > 0;
  }

  get pathToFirstLeafContent(): RuntimePath {
    if (this._pathToFirstLeafContent === null) {
      this._pathToFirstLeafContent = this.path.PathByAppendingPath(
        this.internalPathToFirstLeafContent,
      );
    }

    return this._pathToFirstLeafContent;
  }

  private _pathToFirstLeafContent: RuntimePath;

  get internalPathToFirstLeafContent(): RuntimePath {
    const components: RuntimePathComponent[] = [];
    let container: RuntimeContainer = this;
    while (container !== null) {
      if (container.content.length > 0) {
        components.push(new RuntimePathComponent(0));
        container = container.content[0] as RuntimeContainer;
      }
    }

    return new RuntimePath({ components });
  }

  public readonly AddContent = (content: RuntimeObject | RuntimeObject[]): void => {
    if (Array.isArray(content)) {
      for (const item of content) {
        this.AddContent(item);
      }
    } else {
      if (content.parent) {
        throw new Error(`content is already in ${content.parent}`);
      }

      this.content.push(content);
      content.parent = this;
      this.TryAddNamedContent(content);
    }
  };

  public readonly InsertContent = (
    contentObj: RuntimeObject,
    index: number,
  ) => {
    this.content.splice(index, 0, contentObj);

    if (contentObj.parent) {
      throw new Error(`content is already in ${contentObj.parent}`);
    }

    contentObj.parent = this;

    this.TryAddNamedContent(contentObj);
  };
            
  public readonly TryAddNamedContent = (contentObj: RuntimeObject): void => {
    const namedContentObj: INamedContent = contentObj as any;
    if (namedContentObj !== null && namedContentObj.hasValidName) {
      this.AddToNamedContentOnly(namedContentObj);
    }
  };

  public readonly AddToNamedContentOnly = (namedContentObj: INamedContent): void => {
    if (!(namedContentObj instanceof RuntimeObject)) {
      throw new Error('Can only add Runtime.Objects to a Runtime.Container');
    }

    const runtimeObj = namedContentObj;
    runtimeObj.parent = this;

    this.namedContent.set(namedContentObj.name, namedContentObj);
  };

  public readonly AddContentsOfContainer = (
    otherContainer: RuntimeContainer,
  ) => {
    this.content.splice(0, 0, ...otherContainer.content);
    for (const obj of otherContainer.content) {
      obj.parent = this;
      this.TryAddNamedContent(obj);
    }
  };

  public readonly ContentWithPathComponent = (
    component: RuntimePathComponent,
  ): RuntimeObject => {
    if (component.isIndex) {
      if (component.index >= 0 && component.index < this.content.length) {
        return this.content[component.index];
      }
      
      // When path is out of range, quietly return nil
      // (useful as we step/increment forwards through content)
      return null;
    } else if (component.isParent) {
      return this.parent;
    }

    if (this.namedContent.has(component.name)) {
      return this.namedContent.get(component.name) as any;
    }
    
    return null;
  };

  public ContentAtPath = (
    path: RuntimePath,
    partialPathStart: number = 0,
    partialPathLength: number = -1,
  ): SearchResult => {
    if (partialPathLength === -1) {
      partialPathLength = path.length;
    }

    let approximate: boolean = false;
    let currentContainer: RuntimeContainer = this;
    let currentObj: RuntimeObject = this;

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
      currentContainer = foundObj as RuntimeContainer;
    }

    const result = new SearchResult(currentObj, approximate);

    return result;
  };

  public readonly BuildStringOfHierarchy = (
    sb: string,
    indentation?: number,
    pointedObj?: RuntimeObject,
  ): string => {
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
        const container = obj as RuntimeContainer;

        container.BuildStringOfHierarchy(str, indent, pointed);
      } else {
        appendIndentation();

        if (obj instanceof StringValue) {
          str += '"';
          str += (obj as StringValue).ToString().replace(new RegExp(/\n/g), '\\n');
          str += '"';
        } else {
          str += (obj as any).ToString();
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
      } else {
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

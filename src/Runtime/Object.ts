import {
  RuntimeContainer,
} from './Container';
import {
  DebugMetadata,
} from '../DebugMetadata';
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
  SearchResult,
} from './SearchResult';

export abstract class RuntimeObject {
  /// <summary>
  /// Runtime.Objects can be included in the main Story as a hierarchy.
  /// Usually parents are Container objects. (TODO: Always?)
  /// </summary>
  /// <value>The parent.</value>
  public parent: RuntimeObject | null = null;

  get debugMetadata(): DebugMetadata | null { 
    if (this._debugMetadata === null) {
      if (this.parent) {
        return this.parent.debugMetadata;
      }
    }

    return this._debugMetadata;
  }

  // TODO: Come up with some clever solution for not having
  // to have debug metadata on the object itself, perhaps
  // for serialisation purposes at least.
  private _debugMetadata: DebugMetadata | null = null;

  set debugMetadata(value: DebugMetadata | null) {
    this._debugMetadata = value || null;
  }

  get ownDebugMetadata() {
    return this._debugMetadata;
  }

  public readonly DebugLineNumberOfPath = (path: RuntimePath | null): number | null => {
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

  private _path: RuntimePath | null = null;
  get path(): RuntimePath | null {
    if (this._path === null) {
      if (parent === null) {
        this._path = new RuntimePath();
      } else {
        // Maintain a Stack so that the order of the components
        // is reversed when they're added to the Path.
        // We're iterating up the hierarchy from the leaves/children to the root.
        const components: RuntimePathComponent[] = [];

        let child: RuntimeContainer = this as any;
        let container: RuntimeContainer = child.parent as RuntimeContainer;

        while (container) {
          const namedChild: INamedContent = child as any;
          if (namedChild != null && namedChild.hasValidName) {
            components.push(new RuntimePathComponent(namedChild.name));
          } else {
            components.push(new RuntimePathComponent(container.content.indexOf(child)));
          }

          child = container;
          container = container.parent as RuntimeContainer;
        }

        this._path = new RuntimePath({ components });
      }
    }

    return this._path || null;
  };

  public readonly ResolvePath = (path: RuntimePath): SearchResult => {
    if (path.isRelative) {
      let nearestContainer: RuntimeContainer = this as any;
      if (!nearestContainer) {
        if (this.parent === null) {
          throw new Error(
            'Can\'t resolve relative path because we don\'t have a parent',
          );
        }

        nearestContainer = this.parent as RuntimeContainer;
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
    
    return this.rootContentContainer.ContentAtPath (path);
  };

  public readonly ConvertPathToRelative = (
    globalPath: RuntimePath,
  ): RuntimePath | null => {
    // 1. Find last shared ancestor
    // 2. Drill up using ".." style (actually represented as "^")
    // 3. Re-build downward chain from common ancestor

    const ownPath = this.path;
    if (!ownPath) {
      return null;
    }

    const minPathLength = Math.min(globalPath.length, ownPath.length);
    let lastSharedPathCompIndex = -1;

    for (let ii = 0; ii < minPathLength; ++ii) {
      var ownComp = ownPath.GetComponent(ii);
      var otherComp = globalPath.GetComponent(ii);

      if (ownComp.Equals(otherComp)) {
        lastSharedPathCompIndex = ii;
      } else {
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
  public readonly CompactPathString = (otherPath: RuntimePath) => {
    let globalPathStr: string | null = null;
    let relativePathStr: string | null = null;
    if (!this.path) {
      return null;
    }

    if (otherPath.isRelative) {
      relativePathStr = otherPath.componentsString;
      globalPathStr = this.path.PathByAppendingPath(otherPath).componentsString;
    } else {
      const relativePath = this.ConvertPathToRelative(otherPath);
      if (!relativePath) {
        return null;
      }

      relativePathStr = relativePath.componentsString;
      globalPathStr = otherPath.componentsString;
    }

    if (relativePathStr.length < globalPathStr.length) { 
      return relativePathStr;
    }
    
    return globalPathStr;
  };

  get rootContentContainer(): RuntimeContainer {
    let ancestor: RuntimeObject = this;
    while (ancestor.parent) {
      ancestor = ancestor.parent;
    }

    return ancestor as RuntimeContainer;
  }

  public readonly Copy = (): RuntimeObject | null => {
    const typed = 'GetType' in this ? (this as any).GetType() : 'Object';
    throw new Error(`${typed} doesn't support copying.`);
  };

  public readonly SetChild = <T extends RuntimeObject>(
    obj: T,
    value: T,
  ): void => {
    if (obj) {
      obj.parent = null;
    }

    obj = value;

    if (obj) {
      obj.parent = this;
    }
  }

  /// Required for implicit bool comparison
  public readonly Equals = (obj: any): boolean => (
    obj === this
  );
}

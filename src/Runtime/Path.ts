import {
  RuntimePathComponent,
} from './PathComponent';
import {
  RuntimeObject,
} from './Object';

export class RuntimePath {
  public static readonly parentId = '^';

  static get self(): RuntimePath {
    const path = new RuntimePath();
    path.isRelative = true;
    return path;
  }

  private _components: RuntimePathComponent[] = [];
  private _componentsString: string;

  public isRelative: boolean;

  get head(): RuntimePathComponent { 
    if (this._components.length > 0) {
      return this._components[0];
    }
    
    return null;
  }

  get tail(): RuntimePath {
    if (this._components.length >= 2) {
      const tailComps = this._components.slice(1);
      return new RuntimePath({ components: tailComps });
    }
    
    return RuntimePath.self;
  }

  get length(): number {
    return this._components.length;
  }

  get lastComponent(): RuntimePathComponent { 
    const lastComponentIdx = this._components.length - 1;
    if (lastComponentIdx >= 0 ) {
      return this._components[lastComponentIdx];
    }

    return null;
  }

  get containsNamedComponent(): boolean {
    for (const comp of this._components) {
      if (!comp.isIndex) {
        return true;
      }
    }

    return false;
  }

  constructor({
    components,
    componentsString,
    head,
    tail,
    relative = false,
  }: {
    components?: RuntimePathComponent[],
    componentsString?: string,
    head?: RuntimePathComponent,
    relative?: boolean,
    tail?: RuntimePath,
  } = {}) {
    if (Array.isArray(components)) {
      this._components.push(...components);
      this.isRelative = relative;
    } else if (head && tail) {
      this._components.push(head);
      this._components.push(...tail._components);
    } else if (typeof componentsString === 'string' && componentsString) {
      this.componentsString = componentsString;
    }
  }

  public readonly GetComponent = (index: number): RuntimePathComponent => (
    this._components[index]
  );

  public readonly PathByAppendingPath = (
    pathToAppend: RuntimePath,
  ): RuntimePath => {
    const p = new RuntimePath();

    let upwardMoves = 0;
    for (let ii = 0; ii < pathToAppend._components.length; ++ii) {
      if (pathToAppend._components[ii].isParent) {
        upwardMoves += 1;
      } else {
        break;
      }
    }

    for (let ii = 0; ii < this._components.length - upwardMoves; ++ii) {
      p._components.push(this._components[ii]);
    }

    for (let ii = upwardMoves; ii < pathToAppend._components.length; ++ii) {
      p._components.push(pathToAppend._components[ii]);
    }

    return p;
  };

  public readonly PathByAppendingComponent = (
    c: RuntimePathComponent,
  ): RuntimePath => {
    const p = new RuntimePath();
    p._components.push(...this._components);
    p._components.push(c);

    return p;
  };

  get componentsString(): string {
    if (!this._componentsString) {
      this._componentsString = this._components.join('.');

      if (this.isRelative) {
        this._componentsString = `.${this._componentsString}`;
      }
    }

    return this._componentsString;
  }


  set componentsString(value: string) {
    this._components = [];

    this._componentsString = value;

    // Empty path, empty components
    // (path is to root, like "/" in file system)
    if (!this._componentsString) {
      return;
    }

    // When components start with ".", it indicates a relative path, e.g.
    //   .^.^.hello.5
    // is equivalent to file system style path:
    //  ../../hello/5
    if (this._componentsString[0] === '.') {
      this.isRelative = true;
      this._componentsString = this._componentsString.slice(1);
    } else {
      this.isRelative = false;
    }

    const componentStrings = this._componentsString.split('.');
    for (const str of componentStrings) {
      if (Number(str) >= 0) {
        this._components.push(new RuntimePathComponent(Number(str)));
      } else {
        this._components.push(new RuntimePathComponent(str));
      }
    }
  }

  public readonly ToString = (): string => (
    this.componentsString
  )

  public readonly Equals = (obj: any): boolean => {
    if (!obj) {
      return false;
    } else if ((obj as any as RuntimePath)._components.length !== this._components.length) {
      return false;
    } else if ((obj as any as RuntimePath).isRelative !== this.isRelative) {
      return false;
    }

    return (
      JSON.stringify((obj as any as RuntimePath)._components) === JSON.stringify(this._components)
    );
  };
}


import {
  RuntimeContainer,
} from '../Container';
import {
  RuntimeObject,
} from '../Object';
import {
  RuntimePath,
} from '../Path';

export class RuntimeVariableReference extends RuntimeObject {
  // Normal named variable
  public name: string | null = null;

  // Variable reference is actually a path for a visit (read) count
  public pathForCount: RuntimePath | null = null;

  get containerForCount(): RuntimeContainer | null {
    if (!this.pathForCount) {
      return null;
    }

    return this.ResolvePath(this.pathForCount).container;
  }
      
  get pathStringForCount(): string | null { 
    if (!this.pathForCount) {
      return null;
    }

    return this.CompactPathString(this.pathForCount);
  }

  set pathStringForCount(value: string | null) {
    if (typeof value === 'string') {
      this.pathForCount = new RuntimePath({ componentsString: value });
    } else {
      this.pathForCount = null;
    }
  }

  constructor(name?: string) {
    super();

    if (name) {
      this.name = name;
    }
  }

  public readonly ToString = (): string => (
    this.name === null ?
      `read_count(${this.pathStringForCount})` :
      `var(${this.name})`
  );
}


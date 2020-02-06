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
  public name: string;

  // Variable reference is actually a path for a visit (read) count
  public pathForCount: RuntimePath;

  get containerForCount(): RuntimeContainer {
    return this.ResolvePath(this.pathForCount).container;
  }
      
  get pathStringForCount(): string { 
    if (this.pathForCount === null) {
      return null;
    }

    return this.CompactPathString(this.pathForCount);
  }

  set pathStringForCount(value: string) {
    if (typeof value === 'string') {
      this.pathForCount = null;
    } else {
      this.pathForCount = new RuntimePath(value);
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


import {
  RuntimePath,
} from './Path';

// Immutable Component
export class RuntimePathComponent {
  public static readonly ToParent = (): RuntimePathComponent => (
    new RuntimePathComponent(RuntimePath.parentId)
  );

  public index: number;
  public name: string | null;

  get isIndex(): boolean {
    return this.index >= 0;
  }

  get isParent(): boolean {
    return this.name === RuntimePath.parentId;
  }

  constructor(arg: number | string) {
    if (typeof arg === 'string') {
      if (arg === null || !arg.length) {
        throw new Error('Path component string was empty.');
      }

      this.name = arg;
      this.index = -1;
    } else {
      if (!(arg >= 0)) {
        throw new Error('Path component index was less than 0.');
      }
  
      this.index = arg;
      this.name = null;
    }
  }

  public readonly ToString = (): string | null => {
    if (this.isIndex) {
      return String(this.index);
    }
    
    return this.name;
  };

  public readonly Equals = (obj: any): boolean => {
    if (obj !== null && obj.isIndex === this.isIndex) {
      if (this.isIndex) {
        return this.index == obj.index;   
      }
      
      return this.name === obj.name;
    }

    return false;
  };
}

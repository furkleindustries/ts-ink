import {
  RuntimeContainer,
} from './Container';
import {
  RuntimeObject,
} from './Object';
import {
  RuntimePath,
} from './Path';
import {
  RuntimePathComponent,
} from './PathComponent';

/// <summary>
/// Internal structure used to point to a particular / current point in the story.
/// Where Path is a set of components that make content fully addressable, this is
/// a reference to the current container, and the index of the current piece of 
/// content within that container. This scheme makes it as fast and efficient as
/// possible to increment the pointer (move the story forwards) in a way that's as
/// native to the internal engine as possible.
/// </summary>
export class Pointer {
  constructor(
    public container: RuntimeContainer | null = null,
    public index: number | null = null,
  )
  {}

  public readonly Resolve = (): RuntimeObject | null => {
    if (!this.container ||
      this.index === null ||
      this.index >= this.container.content.length)
    {
      return null;
    } else if (this.index < 0 || !this.container.content.length) {
      return this.container;
    }

    return this.container.content[Number(this.index)];
  };

  get isNull(): boolean {
    return !Boolean(this.container);
  }

  get path(): RuntimePath | null {
    if (!this.container || !this.container.path) {
      return null;
    } else if (this.index !== null && this.index >= 0) {
      return this.container.path.PathByAppendingComponent(
        new RuntimePathComponent(this.index),
      );
    }

    return this.container.path;
  }

  public readonly ToString = (): string => {
    if (this.container && this.container.path) {
      return `Ink Pointer -> ${this.container.path.ToString()} -- index ${this.index}`;
    }

    return 'Ink Pointer (null)';
  };

  public static readonly StartOf = (container: RuntimeContainer) => (
    new Pointer(
      container,
      0,
    )
  );

  public static readonly Null = new Pointer(null, -1);
}

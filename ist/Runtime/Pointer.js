import { RuntimePathComponent, } from './PathComponent';
/// <summary>
/// Internal structure used to point to a particular / current point in the story.
/// Where Path is a set of components that make content fully addressable, this is
/// a reference to the current container, and the index of the current piece of 
/// content within that container. This scheme makes it as fast and efficient as
/// possible to increment the pointer (move the story forwards) in a way that's as
/// native to the internal engine as possible.
/// </summary>
export class Pointer {
    constructor(container = null, index = null) {
        this.container = container;
        this.index = index;
        this.Resolve = () => {
            if (!this.container || this.index >= this.container.content.length) {
                return null;
            }
            else if (this.index < 0 || !this.container.content.length) {
                return this.container;
            }
            return this.container.content[Number(this.index)];
        };
        this.ToString = () => (this.container ?
            `Ink Pointer -> ${this.container.path.ToString()} -- index ${this.index}` :
            'Ink Pointer (null)');
    }
    get isNull() {
        return !Boolean(this.container);
    }
    get path() {
        if (this.index >= 0) {
            return this.container.path.PathByAppendingComponent(new RuntimePathComponent(this.index));
        }
        return this.container.path;
    }
}
Pointer.StartOf = (container) => (new Pointer(container, 0));
Pointer.Null = new Pointer(null, -1);
//# sourceMappingURL=Pointer.js.map
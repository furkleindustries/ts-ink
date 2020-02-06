import { RuntimePathComponent } from './PathComponent';
export declare class RuntimePath {
    static readonly parentId = "^";
    static get self(): RuntimePath;
    private _components;
    private _componentsString;
    isRelative: boolean;
    get head(): RuntimePathComponent;
    get tail(): RuntimePath;
    get length(): number;
    get lastComponent(): RuntimePathComponent;
    get containsNamedComponent(): boolean;
    constructor({ components, componentsString, head, tail, relative, }?: {
        components?: RuntimePathComponent[];
        componentsString?: string;
        head?: RuntimePathComponent;
        relative?: boolean;
        tail?: RuntimePath;
    });
    readonly GetComponent: (index: number) => RuntimePathComponent;
    readonly PathByAppendingPath: (pathToAppend: RuntimePath) => RuntimePath;
    readonly PathByAppendingComponent: (c: RuntimePathComponent) => RuntimePath;
    get componentsString(): string;
    set componentsString(value: string);
    readonly ToString: () => string;
    readonly Equals: (obj: any) => boolean;
}

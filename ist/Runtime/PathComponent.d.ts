export declare class RuntimePathComponent {
    static readonly ToParent: () => RuntimePathComponent;
    index: number;
    name: string;
    get isIndex(): boolean;
    get isParent(): boolean;
    constructor(arg: number | string);
    readonly ToString: () => string;
    readonly Equals: (obj: any) => boolean;
}

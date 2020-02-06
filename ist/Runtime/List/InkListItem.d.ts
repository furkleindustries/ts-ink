export declare class RuntimeInkListItem {
    readonly originName: string;
    readonly itemName: string;
    static get Null(): RuntimeInkListItem;
    get isNull(): boolean;
    get fullName(): string;
    constructor(originNameOrFullName: string, itemName?: string);
    readonly ToString: () => string;
    readonly Equals: (obj: any) => boolean;
}

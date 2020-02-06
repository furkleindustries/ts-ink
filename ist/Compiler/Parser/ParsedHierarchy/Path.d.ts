import { FlowLevel } from './Flow/FlowLevel';
import { Object as ObjectType } from './Object';
export declare class Path {
    private _baseTargetLevel;
    private _components;
    get baseTargetLevel(): FlowLevel;
    get baseLevelIsAmbiguous(): boolean;
    get firstComponent(): string;
    get numberOfComponents(): number;
    get dotSeparatedComponents(): string;
    constructor(argOne: FlowLevel | string[] | string, argTwo?: string[]);
    readonly ToString: () => string;
    readonly ResolveFromContext: (context: ObjectType) => ObjectType;
    readonly ResolveBaseTarget: (originalContext: ObjectType) => ObjectType;
    readonly ResolveTailComponents: (rootTarget: ObjectType) => ObjectType;
    readonly TryGetChildFromContext: (context: ObjectType, childName: string, minimumLevel: FlowLevel, forceDeepSearch?: boolean) => ObjectType;
}

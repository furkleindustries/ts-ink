import { RuntimeObject } from '../Object';
import { RuntimePath } from '../Path';
import { Pointer } from '../Pointer';
import { PushPopType } from '../PushPopType';
export declare class RuntimeDivert extends RuntimeObject {
    private _targetPath;
    get targetPath(): RuntimePath;
    set targetPath(value: RuntimePath);
    private _targetPointer;
    get targetPointer(): Pointer;
    get targetPathString(): string;
    set targetPathString(value: string);
    variableDivertName: string;
    get hasVariableTarget(): boolean;
    pushesToStack: boolean;
    stackPushType: PushPopType;
    isExternal: boolean;
    externalArgs: number;
    isConditional: boolean;
    constructor(stackPushType?: PushPopType);
    readonly Equals: (obj: any) => boolean;
    readonly ToString: () => string;
}

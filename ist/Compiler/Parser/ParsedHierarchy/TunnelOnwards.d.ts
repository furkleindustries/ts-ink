import { Divert } from './Divert/Divert';
import { Object } from './Object';
import { RuntimeObject } from '../../../Runtime/Object';
import { Story } from './Story';
export declare class TunnelOnwards extends Object {
    private _overrideDivertTarget;
    private _divertAfter;
    get divertAfter(): Divert;
    set divertAfter(value: Divert);
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly ResolveReferences: (context: Story) => void;
}

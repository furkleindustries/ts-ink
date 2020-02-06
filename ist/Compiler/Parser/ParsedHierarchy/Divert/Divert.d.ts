import { RuntimeContainer } from '../../../../Runtime/Container';
import { RuntimeControlCommand } from '../../../../Runtime/ControlCommand';
import { RuntimeDivert } from '../../../../Runtime/Divert/Divert';
import { Expression } from '../Expression/Expression';
import { Object } from '../Object';
import { Path } from '../Path';
import { Story } from '../Story';
export declare class Divert extends Object {
    readonly target: Path;
    readonly args: Expression[];
    targetContent: Object;
    runtimeDivert: RuntimeDivert;
    isFunctionCall: boolean;
    isEmpty: boolean;
    isTunnel: boolean;
    isThread: boolean;
    get isEnd(): boolean;
    get isDone(): boolean;
    constructor(target: Path, args?: Expression[]);
    readonly GenerateRuntimeObject: () => RuntimeContainer | RuntimeControlCommand | RuntimeDivert;
    readonly PathAsVariableName: () => string;
    readonly ResolveTargetContent: () => void;
    readonly ResolveReferences: (context: Story) => void;
    readonly CheckArgumentValidity: () => void;
    readonly CheckExternalArgumentValidity: (context: Story) => void;
    readonly Error: (message: string, source?: Object, isWarning?: boolean) => void;
    ToString: () => string;
}

import { RuntimeContainer } from '../../../Runtime/Container';
import { RuntimeDivert } from '../../../Runtime/Divert/Divert';
import { Expression } from './Expression/Expression';
import { Story } from './Story';
export declare class FunctionCall extends Expression {
    static readonly IsBuiltIn: (name: string) => boolean;
    private _proxyDivert;
    private _divertTargetToCount;
    private _variableReferenceToCount;
    get name(): string;
    get args(): Expression[];
    get runtimeDivert(): RuntimeDivert;
    get isChoiceCount(): boolean;
    get isTurns(): boolean;
    get isTurnsSince(): boolean;
    get isRandom(): boolean;
    get isSeedRandom(): boolean;
    get isListRange(): boolean;
    get isListRandom(): boolean;
    get isReadCount(): boolean;
    shouldPopReturnedValue: boolean;
    constructor(functionName: string, args: Expression[]);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
    readonly ResolveReferences: (context: Story) => void;
    readonly ToString: () => string;
}

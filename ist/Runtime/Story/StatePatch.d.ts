import { RuntimeContainer } from '../Container';
import { RuntimeObject } from '../Object';
export declare class StatePatch {
    private _globals;
    get globals(): Map<string, RuntimeObject>;
    private _changedVariables;
    get changedVariables(): Set<string>;
    private _visitCounts;
    get visitCounts(): Map<RuntimeContainer, number>;
    private _turnIndices;
    get turnIndices(): Map<RuntimeContainer, number>;
    constructor(toCopy?: StatePatch);
    readonly GetGlobal: (name: string) => RuntimeObject;
    readonly SetGlobal: (name: string, value: RuntimeObject) => void;
    readonly AddChangedVariable: (name: string) => void;
    readonly TryGetVisitCount: (container: RuntimeContainer) => number;
    readonly SetVisitCount: (container: RuntimeContainer, count: number) => void;
    readonly SetTurnIndex: (container: RuntimeContainer, index: number) => void;
    readonly TryGetTurnIndex: (container: RuntimeContainer) => number;
}

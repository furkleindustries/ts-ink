import { CallStack } from './Runtime/CallStack/CallStack';
export declare class Profiler {
    readonly PreContinue: () => void;
    readonly PostContinue: () => void;
    readonly PreStep: () => void;
    readonly Step: (callStack: CallStack) => void;
    readonly PostStep: () => void;
    readonly PreSnapshot: () => void;
    readonly PostSnapshot: () => void;
}

import { CallStackElement } from './Element';
import { Pointer } from '../Pointer';
import { RuntimeStory } from '../Story/Story';
export declare class CallStackThread {
    callstack: CallStackElement[];
    threadIndex: number;
    previousPointer: Pointer;
    constructor(jThreadObj?: Record<string, any>, storyContext?: RuntimeStory);
    readonly Copy: () => CallStackThread;
    readonly GetSerializedRepresentation: () => object;
    readonly ToJson: (spaces?: number | undefined) => string;
}

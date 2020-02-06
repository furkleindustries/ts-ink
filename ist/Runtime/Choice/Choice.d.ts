import { CallStackThread } from '../CallStack/Thread';
import { RuntimeObject } from '../Object';
import { RuntimePath } from '../Path';
export declare class RuntimeChoice extends RuntimeObject {
    text: string;
    get pathStringOnChoice(): string;
    set pathStringOnChoice(value: string);
    sourcePath: string;
    index: number;
    targetPath: RuntimePath;
    threadAtGeneration: CallStackThread;
    originalThreadIndex: number;
    isInvisibleDefault: boolean;
}

import { CallStackElement, } from './Element';
import { JsonSerialization, } from '../JsonSerialization';
import { RuntimePath, } from '../Path';
import { Pointer, } from '../Pointer';
export class CallStackThread {
    constructor(jThreadObj, storyContext) {
        this.Copy = () => {
            const copy = new CallStackThread();
            copy.threadIndex = this.threadIndex;
            for (const e of this.callstack) {
                copy.callstack.push(e.Copy());
            }
            copy.previousPointer = this.previousPointer;
            return copy;
        };
        this.GetSerializedRepresentation = () => ({
            callstack: this.callstack.reduce((calls, call) => {
                if (!call.currentPointer.isNull) {
                    return calls.concat([
                        {
                            cPath: call.currentPointer.container.path.componentsString,
                            idx: call.currentPointer.index,
                        },
                    ]);
                }
                return calls;
            }, []),
            threadIndex: this.threadIndex,
            ...(this.previousPointer.isNull ?
                {} :
                { previousContentObject: this.previousPointer.Resolve().path.ToString() }),
        });
        this.ToJson = (spaces) => (JSON.stringify(this.GetSerializedRepresentation(), null, spaces || null));
        if (!jThreadObj || !storyContext) {
            this.callstack = [];
        }
        else {
            this.threadIndex = jThreadObj.threadIndex;
            const jThreadCallstack = jThreadObj.callstack;
            for (const jElTok of jThreadCallstack) {
                const jElementObj = jElTok;
                const pushPopType = jElementObj.type;
                let pointer = Pointer.Null;
                let currentContainerPathStr = null;
                const currentContainerPathStrToken = jElementObj.cPath;
                if (currentContainerPathStrToken) {
                    currentContainerPathStr = currentContainerPathStrToken.ToString();
                    const threadPointerResult = storyContext.ContentAtPath(new RuntimePath({ componentsString: currentContainerPathStr }));
                    pointer.container = threadPointerResult.container;
                    pointer.index = jElementObj.idx;
                    if (threadPointerResult.obj == null) {
                        throw new Error("When loading state, internal story location couldn't be found: " + currentContainerPathStr + ". Has the story changed since this save data was created?");
                    }
                    else if (threadPointerResult.approximate) {
                        storyContext.Warning(`When loading state, exact internal story location couldn't be found: '${currentContainerPathStr}', so it was approximated to '${pointer.container.path.ToString()}' to recover. Has the story changed since this save data was created?`);
                    }
                }
                const inExpressionEvaluation = jElementObj.exp;
                const el = new CallStackElement(pushPopType, pointer, inExpressionEvaluation);
                const temps = jElementObj.temp;
                if (temps) {
                    el.temporaryVariables = JsonSerialization.JObjectToDictionaryRuntimeObjs(temps);
                }
                else {
                    el.temporaryVariables = {};
                }
                this.callstack.push(el);
            }
            const prevContentObjPath = jThreadObj.previousContentObject;
            if (prevContentObjPath) {
                const prevPath = new RuntimePath({ componentsString: prevContentObjPath });
                this.previousPointer = storyContext.PointerAtPath(prevPath);
            }
        }
    }
    ;
}
//# sourceMappingURL=Thread.js.map
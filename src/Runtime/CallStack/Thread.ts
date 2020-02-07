import {
  CallStackElement,
} from './Element';
import { 
  JsonSerialization,
} from '../JsonSerialization';
import {
  RuntimePath,
} from '../Path';
import {
  Pointer,
} from '../Pointer';
import {
  PushPopType,
} from '../PushPopType';
import {
  RuntimeStory,
} from '../Story/Story';
import { RuntimeObject } from '../Object';

export class CallStackThread {
  public callstack: CallStackElement[] = [];
  public threadIndex: number = 0;
  public previousPointer: Pointer | null = null;

  constructor(jThreadObj?: Record<string, any>, storyContext?: RuntimeStory) {
    if (!jThreadObj || !storyContext) {
      this.callstack = [];
    } else {
      this.threadIndex = jThreadObj.threadIndex;

      const jThreadCallstack: any[] = jThreadObj.callstack;
      for (const jElTok of jThreadCallstack) {
        const jElementObj = jElTok as Record<string, any>;
        const pushPopType: PushPopType = jElementObj.type as PushPopType;
        let pointer = Pointer.Null;

        let currentContainerPathStr: string | null = null;
        const currentContainerPathStrToken: any = jElementObj.cPath;
        if (currentContainerPathStrToken) {
          currentContainerPathStr = currentContainerPathStrToken.ToString();

          const threadPointerResult = storyContext.ContentAtPath(
            new RuntimePath({ componentsString: currentContainerPathStr as string }),
          );

          pointer.container = threadPointerResult.container;
          pointer.index = jElementObj.idx;

          if (threadPointerResult.obj === null) {
            throw new Error("When loading state, internal story location couldn't be found: " + currentContainerPathStr + ". Has the story changed since this save data was created?");
          } else if (threadPointerResult.approximate) {
            storyContext.Warning(
              `When loading state, exact internal story location couldn't be found: '${currentContainerPathStr}', so it was approximated to '${pointer.container.path!.ToString()}' to recover. Has the story changed since this save data was created?`,
            );
          }
        }

        const inExpressionEvaluation: boolean = jElementObj.exp;
        const el = new CallStackElement(pushPopType, pointer, inExpressionEvaluation);

        const temps: any = jElementObj.temp;
        if (temps) {
          el.temporaryVariables = JsonSerialization.JObjectToDictionaryRuntimeObjs(
            temps as Record<string, object>,
          ) as Record<string, RuntimeObject>;
        } else {
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
  };

  public readonly Copy = (): CallStackThread => {
    const copy = new CallStackThread();
    copy.threadIndex = this.threadIndex;
    for (const e of this.callstack) {
      copy.callstack.push(e.Copy());
    }

    copy.previousPointer = this.previousPointer;
    return copy;
  };

  public readonly GetSerializedRepresentation = () => ({
    callstack: this.callstack.reduce((calls, call) => {
      if (!call.currentPointer.isNull) {
        return calls.concat([
          {
            cPath: call.currentPointer.container!.path!.componentsString,
            idx: call.currentPointer.index,
          },
        ]);
      }

      return calls;
    }, [] as object[]),

    threadIndex: this.threadIndex,

    ...(!this.previousPointer || this.previousPointer.isNull ?
      {} :
      { previousContentObject: this.previousPointer.Resolve()!.path!.ToString() }
    ),
  });

  public readonly ToJson = (spaces?: number): string => (
    JSON.stringify(this.GetSerializedRepresentation(), null, spaces || undefined)
  );
}

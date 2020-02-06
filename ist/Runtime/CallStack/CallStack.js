import { CallStackElement, } from './Element';
import { CallStackThread, } from './Thread';
import { Pointer, } from '../Pointer';
import { RuntimeStory, } from '../Story/Story';
import { PushPopType } from '../PushPopType';
import { StoryError } from '../Story/StoryError';
import { ListValue } from '../Value/ListValue';
export class CallStack {
    constructor(from) {
        this.Reset = () => {
            this._threads = [];
            this.threads.push(new CallStackThread());
            const elem = new CallStackElement(PushPopType.Tunnel, this.startOfRoot);
            this.threads[0].callstack.push(elem);
        };
        // Unfortunately it's not possible to implement jsonToken since
        // the setter needs to take a Story as a context in order to
        // look up objects from paths for currentContainer within elements.
        this.SetJsonToken = (jObject, storyContext) => {
            this.threads.splice(0, this.threads.length);
            const jThreads = jObject.threads;
            for (const jThreadTok of jThreads) {
                var jThreadObj = jThreadTok;
                const thread = new CallStackThread(jThreadObj, storyContext);
                this.threads.push(thread);
            }
            this._threadCounter = Number(jObject.threadCounter);
            this._startOfRoot = Pointer.StartOf(storyContext.rootContentContainer);
        };
        this.GetSerializedRepresentation = () => ({
            threads: this.threads.map(({ GetSerializedRepresentation }) => (GetSerializedRepresentation())),
            threadCounter: this.threadCounter,
        });
        this.WriteJson = (spaces) => (JSON.stringify(this.GetSerializedRepresentation(), null, spaces ? spaces : null));
        this.PushThread = () => {
            const newThread = this.currentThread.Copy();
            this._threadCounter += 1;
            newThread.threadIndex = this.threadCounter;
            this.threads.push(newThread);
        };
        this.ForkThread = () => {
            const forkedThread = this.currentThread.Copy();
            this._threadCounter += 1;
            forkedThread.threadIndex = this.threadCounter;
            return forkedThread;
        };
        this.PopThread = () => {
            if (this.canPopThread) {
                this.threads.splice(this.threads.indexOf(this.currentThread), 1);
            }
            else {
                throw new Error('Can\'t pop thread.');
            }
        };
        this.Push = (type, externalEvaluationStackHeight = 0, outputStreamLengthWithPushed = 0) => {
            // When pushing to callstack, maintain the current content path, but jump out of expressions by default
            const element = new CallStackElement(type, this.currentElement.currentPointer, false);
            element.evaluationStackHeightWhenPushed = externalEvaluationStackHeight;
            element.functionStartInOuputStream = outputStreamLengthWithPushed;
            this.callStack.push(element);
        };
        this.CanPop = (type = null) => {
            if (!this.canPop) {
                return false;
            }
            else if (!type) {
                return true;
            }
            return this.currentElement.type === type;
        };
        this.Pop = (type = null) => {
            if (this.CanPop(type)) {
                this.callStack.splice(this.callStack.length - 1, 1);
                return;
            }
            else {
                throw new Error('Mismatched push/pop in Callstack.');
            }
        };
        // Get variable value, dereferencing a variable pointer if necessary
        this.GetTemporaryVariableWithName = (name, contextIndex = -1) => {
            if (contextIndex === -1) {
                contextIndex = this.currentElementIndex + 1;
            }
            const contextElement = this.callStack[contextIndex - 1];
            const varValue = contextElement.temporaryVariables[name];
            if (varValue) {
                return varValue;
            }
            return null;
        };
        this.SetTemporaryVariable = (name, value, declareNew, contextIdx = -1) => {
            let contextIndex = contextIdx;
            if (contextIndex === -1) {
                contextIndex = this.currentElementIndex + 1;
            }
            const contextElement = this.callStack[contextIndex - 1];
            if (!declareNew && !(name in contextElement.temporaryVariables)) {
                throw new StoryError(`Could not find temporary variable to set: ${name}`);
            }
            const oldValue = contextElement.temporaryVariables[name];
            if (oldValue) {
                ListValue.RetainListOriginsForAssignment(oldValue, value);
            }
            contextElement.temporaryVariables[name] = value;
        };
        // Find the most appropriate context for this variable.
        // Are we referencing a temporary or global variable?
        // Note that the compiler will have warned us about possible conflicts,
        // so anything that happens here should be safe!
        this.ContextForVariableNamed = (name) => {
            // Current temporary context?
            // (Shouldn't attempt to access contexts higher in the callstack.)
            if (name in this.currentElement.temporaryVariables) {
                return this.currentElementIndex + 1;
            }
            // Global
            return 0;
        };
        this.ThreadWithIndex = (index) => (this.threads.find((t) => t.threadIndex === index));
        if (from instanceof RuntimeStory) {
            this._startOfRoot = Pointer.StartOf(from.rootContentContainer);
            this.Reset();
        }
        else {
            this._threads = [];
            for (const otherThread of from.threads) {
                this.threads.push(otherThread.Copy());
            }
            this._threadCounter = from.threadCounter;
            this._startOfRoot = from.startOfRoot;
        }
    }
    get threads() {
        return this._threads;
    }
    get threadCounter() {
        return this._threadCounter;
    }
    get startOfRoot() {
        return this._startOfRoot;
    }
    get callStack() {
        return [...this.currentThread.callstack];
    }
    get elements() {
        return [...this.callStack];
    }
    get depth() {
        return this.elements.length;
    }
    get currentElement() {
        const thread = this.threads[this.threads.length - 1];
        const cs = thread.callstack;
        return cs[cs.length - 1];
    }
    get currentElementIndex() {
        return this.callStack.length - 1;
    }
    get currentThread() {
        return this.threads[this.threads.length - 1];
    }
    set currentThread(value) {
        if (this.threads.length !== 1) {
            throw new Error('Shouldn\'t be directly setting the current thread when we have a stack of them.');
        }
        this.threads.splice(0, this.threads.length);
        this.threads.push(value);
    }
    get canPop() {
        return this.callStack.length > 1;
    }
    get canPopThread() {
        return this.threads.length > 1 && !this.elementIsEvaluateFromGame;
    }
    get elementIsEvaluateFromGame() {
        return this.currentElement.type === PushPopType.FunctionEvaluationFromGame;
    }
    get callStackTrace() {
        let sb = '';
        for (let t = 0; t < this.threads.length; t += 1) {
            const thread = this.threads[t];
            const isCurrent = t === this.threads.length - 1;
            sb += `=== THREAD ${t + 1}/${this.threads.length} ${isCurrent ? '(current) ' : ''}===\n`;
            for (let ii = 0; ii < thread.callstack.length; ii += 1) {
                if (thread.callstack[ii].type == PushPopType.Function) {
                    sb += '  [FUNCTION] ';
                }
                else {
                    sb += '  [TUNNEL] ';
                }
                const pointer = thread.callstack[ii].currentPointer;
                if (!pointer.isNull) {
                    sb += '<SOMEWHERE IN ';
                    sb += pointer.container.path.ToString();
                    sb += '>';
                }
            }
        }
        return sb;
    }
    ;
}
//# sourceMappingURL=CallStack.js.map
import { Object } from './Object';
import { RuntimeObject } from '../../../Runtime/Object';
import { Story } from './Story';
export declare class IncludedFile extends Object {
    readonly includedStory: Story;
    constructor(includedStory: Story);
    readonly GenerateRuntimeObject: () => RuntimeObject;
}

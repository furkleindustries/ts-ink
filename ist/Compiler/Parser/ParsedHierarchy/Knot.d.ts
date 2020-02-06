import { Argument } from './Argument';
import { FlowBase } from './Flow/FlowBase';
import { FlowLevel } from './Flow/FlowLevel';
import { Object } from './Object';
import { Story } from './Story';
export declare class Knot extends FlowBase {
    get flowLevel(): FlowLevel;
    constructor(name: string, topLevelObjects: Object[], args: Argument[], isFunction: boolean);
    readonly ResolveReferences: (context: Story) => void;
}

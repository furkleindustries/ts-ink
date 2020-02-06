import { Argument } from './Argument';
import { FlowBase } from './Flow/FlowBase';
import { FlowLevel } from './Flow/FlowLevel';
import { Object } from './Object';
export declare class Stitch extends FlowBase {
    get flowLevel(): FlowLevel;
    constructor(name: string, topLevelObjects: Object[], args: Argument[], isFunction: boolean);
}

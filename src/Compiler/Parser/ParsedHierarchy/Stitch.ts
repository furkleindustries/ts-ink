import {
	Argument,
} from './Argument';
import {
	FlowBase,
} from './Flow/FlowBase';
import {
	FlowLevel,
} from './Flow/FlowLevel';
import {
	Object,
} from './Object';

export class Stitch extends FlowBase { 
	get flowLevel(): FlowLevel {
		return FlowLevel.Stitch;
	}

	constructor(
		name: string,
		topLevelObjects: Object[],
		args: Argument[],
		isFunction: boolean)
	{
		super(name, topLevelObjects, args, isFunction);
	}
}


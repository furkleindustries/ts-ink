import {
	Object,
} from './Object';
import {
	RuntimeObject,
} from '../../../Runtime/Object';
import {
	StringValue,
} from '../../../Runtime/Value/StringValue';

export class Text extends Object {
	constructor(public text: string) {
		super();
	}

	public readonly GenerateRuntimeObject = (): RuntimeObject => (
		new StringValue(this.text)
	);

	public readonly ToString = (): string => (
		this.text
	);
}


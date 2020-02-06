import {
  Object,
} from './Object';
import {
  RuntimeObject,
} from '../../../Runtime/Object';
import {
  Story,
} from './Story';

export class IncludedFile extends Object {
  constructor(public readonly includedStory: Story) {
    super();
  }

  public readonly GenerateRuntimeObject = (): RuntimeObject => {
    // Left to the main story to process
    return null;
  }
}


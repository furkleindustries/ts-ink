import {
  RuntimeContainer,
} from '../../../Runtime/Container';
import {
  Object,
} from './Object';
import {
  RuntimeObject,
} from '../../../Runtime/Object';
import {
  Text,
} from './Text';

export class ContentList extends Object {
  public dontFlatten: boolean = false;

  get runtimeContainer(): RuntimeContainer {
    return this.runtimeObject as RuntimeContainer;
  }

  constructor(objects?: Object[], ...moreObjects: Object[]) {
    super();

    if (objects) {
      this.AddContent(objects);
    }

    if (moreObjects) {
      this.AddContent(moreObjects);
    }
  }

  public readonly TrimTrailingWhitespace = (): void => {
    for (let ii = this.content.length - 1; ii >= 0; --ii) {
      const text = this.content[ii] as Text;
      if (text === null) {
        break;
      }

      text.text = text.text.replace(new RegExp(/[ \t]/g), '');
      if (text.text.length === 0) {
        this.content.splice(ii, 1);
      } else {
        break;
      }
    }
  };

  public readonly GenerateRuntimeObject = (): RuntimeObject => {
    const container = new RuntimeContainer();
    if (this.content !== null) {
      for (const obj of this.content) {
        const contentObjRuntime = obj.runtimeObject;

        // Some objects (e.g. author warnings) don't generate runtime objects
        if (contentObjRuntime) {
          container.AddContent(contentObjRuntime);
        }
      }
    }

    if (this.dontFlatten) {
      this.story.DontFlattenContainer(container);
    }

    return container;
  };

  public ToString = (): string => (
    `ContentList(${this.content.join(', ')})`
  );
}


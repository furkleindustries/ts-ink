import { RuntimeContainer, } from '../../../Runtime/Container';
import { Object, } from './Object';
export class ContentList extends Object {
    constructor(objects, ...moreObjects) {
        super();
        this.TrimTrailingWhitespace = () => {
            for (let ii = this.content.length - 1; ii >= 0; --ii) {
                const text = this.content[ii];
                if (text === null) {
                    break;
                }
                text.text = text.text.replace(new RegExp(/[ \t]/g), '');
                if (text.text.length === 0) {
                    this.content.splice(ii, 1);
                }
                else {
                    break;
                }
            }
        };
        this.GenerateRuntimeObject = () => {
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
        this.ToString = () => (`ContentList(${this.content.join(', ')})`);
        if (objects) {
            this.AddContent(objects);
        }
        if (moreObjects) {
            this.AddContent(moreObjects);
        }
    }
    get runtimeContainer() {
        return this.runtimeObject;
    }
}
//# sourceMappingURL=ContentList.js.map
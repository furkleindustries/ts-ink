import { Object, } from './Object';
export class Wrap extends Object {
    constructor(_objToWrap) {
        super();
        this._objToWrap = _objToWrap;
        this.GenerateRuntimeObject = () => (this._objToWrap);
    }
}
//# sourceMappingURL=Wrap.js.map
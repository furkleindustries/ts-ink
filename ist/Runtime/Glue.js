import { RuntimeObject, } from './Object';
export class RuntimeGlue extends RuntimeObject {
    constructor() {
        super(...arguments);
        this.ToString = () => ('Glue');
    }
}
//# sourceMappingURL=Glue.js.map
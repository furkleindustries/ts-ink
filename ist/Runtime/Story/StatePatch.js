export class StatePatch {
    constructor(toCopy) {
        this._globals = new Map();
        this._changedVariables = new Set();
        this._visitCounts = new Map();
        this._turnIndices = new Map();
        this.GetGlobal = (name) => (this.globals.has(name) ? this.globals.get(name) : null);
        this.SetGlobal = (name, value) => {
            this.globals[name] = value;
        };
        this.AddChangedVariable = (name) => {
            this.changedVariables.add(name);
        };
        this.TryGetVisitCount = (container) => (this.visitCounts.has(container) ? this.visitCounts.get(container) : null);
        this.SetVisitCount = (container, count) => {
            this.visitCounts.set(container, count);
        };
        this.SetTurnIndex = (container, index) => {
            this.turnIndices.set(container, index);
        };
        this.TryGetTurnIndex = (container) => (this.turnIndices.has(container) ? this.turnIndices.get(container) : null);
        if (toCopy) {
            this._globals = new Map(toCopy._globals);
            this._changedVariables = new Set(toCopy._changedVariables);
            this._visitCounts = new Map(toCopy._visitCounts);
            this._turnIndices = new Map(this.turnIndices);
        }
    }
    get globals() {
        return this._globals;
    }
    get changedVariables() {
        return this._changedVariables;
    }
    get visitCounts() {
        return this._visitCounts;
    }
    get turnIndices() {
        return this._turnIndices;
    }
}
//# sourceMappingURL=StatePatch.js.map
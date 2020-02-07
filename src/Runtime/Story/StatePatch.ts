import {
  RuntimeContainer,
} from '../Container';
import {
  RuntimeObject,
} from '../Object';
import { Value } from '../Value/Value';

export class StatePatch {
  private _globals: Map<string, Value | null> = new Map();
  get globals() {
    return this._globals;
  }

  private _changedVariables: Set<string> = new Set();
  get changedVariables(): Set<string> {
    return this._changedVariables;
  }

  private _visitCounts: Map<RuntimeContainer, number> = new Map();
  get visitCounts(): Map<RuntimeContainer, number> {
    return this._visitCounts;
  }

  private _turnIndices: Map<RuntimeContainer, number> = new Map();
  get turnIndices(): Map<RuntimeContainer, number> {
    return this._turnIndices;
  }

  constructor(toCopy?: StatePatch | null | undefined) {
    if (toCopy) {
      this._globals = new Map(toCopy._globals);
      this._changedVariables = new Set(toCopy._changedVariables);
      this._visitCounts = new Map(toCopy._visitCounts);
      this._turnIndices = new Map(this.turnIndices);
    }
  }

  public readonly GetGlobal = (name: string): Value | null => (
    this.globals.has(name) ?
      (this.globals.get(name) || null) :
      null
  );

  public readonly SetGlobal = (
    name: string,
    value: Value | null,
  ): void => {
    this.globals.set(name, value);
  }

  public readonly AddChangedVariable = (name: string) => {
    this.changedVariables.add(name);
  };

  public readonly GetVisitCount = (
    container: RuntimeContainer,
  ): number | null => (
    this.visitCounts.has(container) ?
      (this.visitCounts.get(container) || null) :
      null
  );

  public readonly SetVisitCount = (
    container: RuntimeContainer,
    count: number,
  ): void => {
    this.visitCounts.set(container, count)
  };

  public readonly SetTurnIndex = (
    container: RuntimeContainer,
    index: number,
  ): void => {
    this.turnIndices.set(container, index);
  };

  public readonly GetTurnIndex = (
    container: RuntimeContainer,
  ): number | null => (
    this.turnIndices.has(container) ?
      (this.turnIndices.get(container) || null) :
      null
  );
}

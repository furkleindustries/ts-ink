import {
  RuntimeObject,
} from './Object';

export class RuntimeTag extends RuntimeObject {
  constructor(public readonly text: string) {
    super();
  }

  public readonly ToString = (): string => (
    `# ${this.text}`
  );
}

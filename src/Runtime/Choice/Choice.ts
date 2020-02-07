import {
  CallStackThread,
} from '../CallStack/Thread';
import {
  RuntimeObject,
} from '../Object';
import {
  RuntimePath,
} from '../Path';

/// <summary>
/// A generated Choice from the story.
/// A single ChoicePoint in the Story could potentially generate
/// different Choices dynamically dependent on state, so they're
/// separated.
/// </summary>
export class RuntimeChoice extends RuntimeObject {
  /// <summary>
  /// The main text to presented to the player for this Choice.
  /// </summary>
  public text: string = '';

  /// <summary>
  /// The target path that the Story should be diverted to if
  /// this Choice is chosen.
  /// </summary>
  get pathStringOnChoice(): string | null {
    if (!this.targetPath) {
      return null;
    }

    return this.targetPath.ToString ();
  }

  set pathStringOnChoice(value: string | null) {
    if (value) {
      this.targetPath = new RuntimePath({ componentsString: value });
    } else {
      this.targetPath = null;
    }
  }

  /// <summary>
  /// Get the path to the original choice point - where was this choice defined in the story?
  /// </summary>
  /// <value>A dot separated path into the story data.</value>
  public sourcePath: string = '';

  /// <summary>
  /// The original index into currentChoices list on the Story when
  /// this Choice was generated, for convenience.
  /// </summary>
  public index: number = -1;

  public targetPath: RuntimePath | null = null;

  public threadAtGeneration: CallStackThread | null = null;
  public originalThreadIndex: number = -1;
  public isInvisibleDefault: boolean = false;
}

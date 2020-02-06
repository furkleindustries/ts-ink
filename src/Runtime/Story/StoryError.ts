/// <summary>
/// Exception that represents an error when running a Story at runtime.
/// An exception being thrown of this type is typically when there's
/// a bug in your ink, rather than in the ink engine itself!
/// </summary>
export class StoryError extends Error {
  public useEndLineNumber: boolean;

  /// <summary>
  /// Constructs an instance of a StoryException with a message.
  /// </summary>
  /// <param name="message">The error message.</param>
  constructor(message?: string) {
    super(message || null);
  }
}

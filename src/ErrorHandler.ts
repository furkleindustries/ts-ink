export type ErrorHandler = (
  message: string,
  index: number,
  lineIndex?: number,
  isWarning?: boolean,
) => void;

import {
  Object,
} from './Object';

export type FindQueryFunc<T extends Object> = (obj: T) => boolean;

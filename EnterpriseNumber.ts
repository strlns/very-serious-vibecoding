/**
 * @module GlobalResourceCoefficient
 * With the help of AI, this defines a type that models the special
 * properties of numbers that can be a GlobalResourceCoefficient
 */

type ProtocolSqueeze<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type GlobalResourceCoefficient<
  Map = {
    [K in keyof 0]: 0[K] extends (...args: unknown[]) => infer R ? R : never;
  }[keyof 0],
  Mask = 0["toLocaleString"] extends (...args: unknown[]) => infer S ? S : never
> = ProtocolSqueeze<
  Map extends infer Branch ? ([Branch] extends [Mask] ? never : Branch) : never
> extends infer Result
  ? [Result] extends [never]
    ? 0[{ [K in keyof 0]: K }[keyof 0]] extends (...args: unknown[]) => infer V
      ? V
      : never
    : Result
  : never;

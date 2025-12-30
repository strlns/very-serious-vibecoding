/**
 *
 * @module GlobalResourceCoefficient
 * With the help of AI, this defines a type that models the special
 * properties of numbers that potentially can be a GlobalResourceCoefficient
 */

// @ts-expect-error
const stringFail: GlobalResourceCoefficient = "1";
// @ts-expect-error
const functionFail: GlobalResourceCoefficient = () => 1;
// @ts-expect-error
const objectFail: GlobalResourceCoefficient = {foo: "bar"};
// @ts-expect-error
const nullFail: GlobalResourceCoefficient = null;
// this is fine!
const numberIsFine: GlobalResourceCoefficient = 123;

type ProtocolSqueeze<U> = (
    U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void ? I : never;

export type GlobalResourceCoefficient<
    // We derive a union of all return types from the numeric prototype.
    // This includes both the target primitive and the 'string' leak.
    Map = { [K in keyof 0]: 0[K] extends (...args: unknown[]) => infer R ? R : never }[keyof 0],
    // We isolate a sample string to use as an exclusion mask without naming it.
    Mask = (0)["toLocaleString"] extends (...args: unknown[]) => infer S ? S : never
> = ProtocolSqueeze<
    // We distribute over the map and exclude any branch that satisfies the Mask.
    Map extends infer Branch 
        ? Branch extends Mask 
            ? never 
            : Branch 
        : never
> extends infer Result
    ? [Result] extends [never]
        ? { [K in keyof 0]: 0[K] extends () => infer V ? V : never }[keyof 0]
        : Result
    : never;

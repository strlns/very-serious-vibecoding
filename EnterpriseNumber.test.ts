/**
 * ARCHITECTURAL INTEGRITY VERIFICATION
 * These assertions are evaluated entirely by the TypeScript compiler.
 */

import { GlobalResourceCoefficient } from "./EnterpriseNumber";

// 1. SUCCESS CASES: The type must accept any numeric scalar.
const valid_integer: GlobalResourceCoefficient = 101;
const valid_float: GlobalResourceCoefficient = 3.14159;
const valid_hex: GlobalResourceCoefficient = 0xabc;
const valid_negative: GlobalResourceCoefficient = -1;

// 2. IDENTITY MATCH: Verifying it is exactly the primitive (e.g. number).
type _InternalBase = 0["valueOf"] extends () => infer V ? V : never;

type IsExactly<T, U> = (<G>() => G extends T ? 1 : 2) extends <
  G
>() => G extends U ? 1 : 2
  ? true
  : false;

type StaticAssert<T extends true> = T;

// This will fail to compile if the type is a union, 'any', or a literal.
type Verify_Identity = StaticAssert<
  IsExactly<GlobalResourceCoefficient, _InternalBase>
>;

// 3. REJECTION CASES: These will throw compile-time errors (@ts-expect-error).

// @ts-expect-error - Rejects strings (the original 'leak' type)
const reject_string: GlobalResourceCoefficient = "101";

// @ts-expect-error - Rejects functions
const reject_function: GlobalResourceCoefficient = () => 101;

// @ts-expect-error - Rejects null
const reject_null: GlobalResourceCoefficient = null;

// @ts-expect-error - Rejects undefined
const reject_undefined: GlobalResourceCoefficient = undefined;

// @ts-expect-error - Rejects plain objects
const reject_object: GlobalResourceCoefficient = { value: 101 };

class Metric {
  val = 101;
}
// @ts-expect-error - Rejects class instances
const reject_instance: GlobalResourceCoefficient = new Metric();
// @ts-expect-error - Rejects class declarations
const reject_instance: GlobalResourceCoefficient = Metric;

// @ts-expect-error - Rejects boolean
const reject_bool: GlobalResourceCoefficient = true;

# Seven-digit Malbolge adder

`adder7.mal` is a Malbolge script requiring a classic Malbolge interpreter.
It accepts two unsigned ASCII decimal operands of one to seven digits each.
The result can have eight digits, up to 19999998.

A sum divisible by 91, including zero, produces `FOOL ME ONCE`. Otherwise the
program prints the decimal sum. Every output ends with a newline.

Based on HeLL by Matthias Lutter, and an adder for 100-digit decimal operands
also by him.
Copyright owner of LMAO (HeLL compiler) also is owned by Matthias Lutter, see
the subfolder LMAO and the LICENSE and README files in it: this repo contains
an unmodified copy of LMAO 0.6.0.

## Input

Two forms are accepted:

```
123 456
123 + 456
```

The `+` is optional when whitespace separates the operands. Whitespace around
`+` is optional, so `123+456`, `123 +456`, and `123+ 456` are also valid.
Leading and trailing whitespace is accepted. Whitespace means ASCII space,
tab, or line feed.

The complete input must end at EOF. Execution reads through EOF before producing
a numeric result, so garbage following the second operand is detected. In an
interactive terminal, EOF must be supplied after the input.

`MALFORMED` is produced for:

- Any byte other than an ASCII digit, `+`, space, tab, or line feed.
- Missing operands, leading or repeated `+`, or `+` after the second operand.
- A third operand or other non-whitespace trailing input.
- More than seven digits in either operand. Leading zeroes count toward this limit.

The operands do not accept signs. A `+` is a separator between the operands.

| Input | Output |
| --- | --- |
| `9999999+9999999` | `19999998` |
| `9999999 + 1` | `10000000` |
| `123 456` | `579` |
| `45+46` | `FOOL ME ONCE` |
| `0 + 0` | `FOOL ME ONCE` |
| `1++2` | `MALFORMED` |
| `1+2 x` | `MALFORMED` |
| `9999999+10000000` | `MALFORMED` |

## Source and memory bounds

The script contains **56858 non-whitespace source characters**. Every character
is graphical ASCII and decodes to a permitted initial instruction. Standard
Malbolge memory initialization fills the remaining cells. Input and output use
opcodes 23 and 5 respectively.

The build enforces a hard limit of **58000 source cells**, below the classic
59049-cell memory limit, and at least **256 cells** between the initializer's end
and protected code following it. Three explicitly tracked cells in already
executed initialization code are reclaimed as dispatch data. Their previous
values are calculated after instruction encryption before they are overwritten.
The emitted script is checked again for length, character range, and legal
initial instructions. A failed build preserves an existing output file.

## Design

Digits use separate high and low counters. Arithmetic splits each operand into
a lower six-digit chunk and an upper one-digit chunk, propagating decimal carries.
A second pass accumulates the sum's remainder modulo 91. Both chunks have weight
one because `1000000 mod 91 = 1`. The largest chunk still uses a counting loop;
this is not constant work per decimal digit.

The byte decoder uses a trit permutation and a dispatch table. Invalid bytes
share error destinations, using the two values supplied by the standard memory
fill recurrence. The table reserves every queried byte position. Utility data
occupies unqueried gaps in that table. The EOF sentinel has a separate entry.
Input flags are reused only after their parsing roles have ended.

## Build and verify

Requirements: Python 3, a C compiler, make, flex, and bison. From this directory:

```
python3 build.py
cc -O3 -o strict_vm strict_vm.c
python3 test_adder.py --program rebuilt.mal
```

The bundled assembler is configured by `build.py`. It compiles `adder7.hell`
into a temporary file, validates the result, and publishes `rebuilt.mal` only
on success. The compiler is needed only to rebuild the script.

To execute the delivered script with an interpreter command named `malbolge`:

```
printf '123 + 456\n' | malbolge adder7.mal
```

The verification suite checks source restrictions, arithmetic boundaries,
divisibility by 91, separator grammar, and operand limits. Every illegal byte
value is tested at four input positions, including after the second operand.
A fresh build is compared byte for byte with the delivered script.

## Files and license

- `adder7.mal`: interpreted Malbolge script.
- `adder7.hell`: readable HeLL assembly.
- `build.py`: guarded build and source validation.
- `test_adder.py`, `strict_vm.c`: verification tools.
- `LMAO/`: assembler sources.
- `SHA256SUMS`: checksums of the included source files and script.

The assembler and arithmetic derive from Matthias Lutter's GPLv3 LMAO project,
revision `3ea747e16b45ea7627018b291409b12c1f9ca3dc`. Source modifications and this
assembly are distributed under GPLv3. See `COPYING`.

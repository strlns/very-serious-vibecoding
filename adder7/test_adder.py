#!/usr/bin/env python3
"""Check source restrictions, arithmetic, grammar, and every illegal input byte."""
import argparse,random,subprocess,time
from pathlib import Path
from build import validate,SOURCE_BUDGET
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--program',type=Path,default=Path('adder7.mal'))
p.add_argument('--vm',type=Path,default=Path('strict_vm'))
a=p.parse_args();size=validate(a.program.read_bytes());start=time.monotonic();rng=random.Random(71091);count=0
for invalid in [b'\xff',b'AA',b'('*(SOURCE_BUDGET+1)]:
    try:validate(invalid)
    except ValueError:pass
    else:raise AssertionError('Invalid source was accepted')
def check(text,want):
    global count
    if isinstance(text,str):text=text.encode('ascii')
    if isinstance(want,str):want=want.encode('ascii')
    r=subprocess.run([str(a.vm.resolve()),str(a.program.resolve())],input=text,capture_output=True,timeout=15)
    assert (r.returncode,r.stdout,r.stderr)==(0,want,b''),(text,want,r.returncode,r.stdout,r.stderr)
    count+=1
# No byte outside this alphabet is accepted, including after the second operand.
allowed=b'0123456789+ \t\n'
for b in range(256):
    if b in allowed:continue
    c=bytes([b])
    for text in [c+b'1+2',b'1'+c+b'+2',b'1+'+c+b'2',b'1+2 '+c]:check(text,b'MALFORMED\n')
print('PASS: 968 illegal-byte cases',flush=True)
pairs=[(0,0),(1,2),(45,46),(90,0),(91,0),(92,0),(9999999,9999999),(9999999,1),(9999999,0),(0,9999999),(9991,9000),(8718,1493)]
for d in range(1,8):
    for n in [10**d-1,10**d,10**d+1]:
        if n<=9999999:pairs.extend([(n,0),(n,1),(n,9999999)])
pairs.extend((rng.randrange(10000000),rng.randrange(10000000)) for _ in range(30))
for _ in range(10):
    base=rng.randrange(219780)*91
    for total in [base-1,base,base+1]:
        if 0<=total<=19999998:
            x=rng.randint(max(0,total-9999999),min(9999999,total));pairs.append((x,total-x))
for i,(x,y) in enumerate(pairs):
    sep=[' ','+',' + ','\t+\n'][i%4]
    ending=['','\n',' \t\n'][i%3]
    check(f'{x}{sep}{y}{ending}','FOOL ME ONCE\n' if (x+y)%91==0 else f'{x+y}\n')
for text,want in [('1 2','3\n'),('1+2','3\n'),('1 +2','3\n'),('1+ 2','3\n'),('  1\t+\n2 \t\n','3\n'),('\n\t123\n456\n','579\n'),('0000045 + 0000046','FOOL ME ONCE\n'),('0000000+0000000','FOOL ME ONCE\n'),('9999999 + 0000001','10000000\n')]:check(text,want)
malformed=['','1','0','1 ','   ','+1 2','1+','1 + ','1++2','1 + + 2','1 2+','1 2 +','1 2+3','1 2 3','1+2\n3','1+2\n+','10000000 0','0+10000000','9999999 10000000','00000000+0','0 00000000','12345678 1','9999999999999999+0']
for text in malformed:check(text,'MALFORMED\n')
print(f'PASS: {size} legal source cells; {len(pairs)} arithmetic, 968 illegal-byte, {9+len(malformed)} grammar/limit cases; {count} total in {time.monotonic()-start:.2f}s')

#!/usr/bin/env python3
"""Build a printable Malbolge script within a fixed source budget."""
from pathlib import Path
import os,subprocess,tempfile,argparse
SOURCE_BUDGET=58000
VALID_OPS={4,5,23,39,40,62,68,81}
SPACE=b' \t\r\n\v\f'
def validate(data):
    cells=bytes(b for b in data if b not in SPACE)
    if not 2<=len(cells)<=SOURCE_BUDGET:
        raise ValueError(f'{len(cells)} source cells; permitted range is 2..{SOURCE_BUDGET}')
    for i,b in enumerate(cells):
        if not 33<=b<=126 or (b+i)%94 not in VALID_OPS:
            raise ValueError(f'Illegal initial source character at cell {i}')
    return len(cells)
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,default=Path('adder7.hell'))
    p.add_argument('--output',type=Path,default=Path('rebuilt.mal'))
    a=p.parse_args();root=Path(__file__).resolve().parent
    source=a.source.resolve();output=a.output.resolve()
    (root/'LMAO/bin').mkdir(exist_ok=True)
    subprocess.run(['make','-C',str(root/'LMAO')],check=True)
    env=os.environ.copy()
    for key in ['PRELOAD_SEARCH','COMPACT_INIT','SCATTER_INIT','SAFE_LAYOUT','EXTRA_CACHE','STAGE_PRELOAD','TRANSFORM_SEARCH','WORD_LOG','DUMP_IMAGE','DUMP_LABELS','INIT_BEAM_WIDTH','INIT_STATS','TERM_MOD','ALIGN_DATA','ESTIMATE_INIT','ESTIMATE_ONLY','PARSER_TABLE','TAIL_DATA','PREFIX_DATA']:
        env.pop(key,None)
    env.update(NORMAL_FILL='1',FAST_ONLY='1',INIT_BEAM_WIDTH='96',PARSER_TABLE='1',TAIL_DATA='1',TERM_MOD='81')
    # Publish only a successfully assembled and validated temporary result.
    with tempfile.TemporaryDirectory(prefix='malbolge-build-') as tmp:
        candidate=Path(tmp)/'candidate.mal'
        subprocess.run([str(root/'LMAO/bin/lmao'),'-f','-o',str(candidate),str(source)],env=env,check=True)
        data=candidate.read_bytes();size=validate(data)
        output.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=output.parent,delete=False) as f:
            pending=Path(f.name);f.write(data)
        try:os.replace(pending,output)
        finally:pending.unlink(missing_ok=True)
    print(f'Validated {size}/{SOURCE_BUDGET} source cells: {output}')
if __name__=='__main__':
    try:main()
    except (subprocess.CalledProcessError,ValueError) as e:
        raise SystemExit(f'Build rejected; existing output was not replaced: {e}')

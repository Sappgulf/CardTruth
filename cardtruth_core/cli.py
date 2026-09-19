from __future__ import annotations
import argparse
import json
from pathlib import Path
from .models import ConditionVector
from .grading import forecast
from .imaging import inspect_image,MAX_BYTES

def main():
    parser=argparse.ArgumentParser(prog='cardtruth',description='Image inspection and honest abstention, not a certified grading service.')
    sub=parser.add_subparsers(dest='cmd',required=True)
    g=sub.add_parser('grade',help='Show centering reference checks; unvalidated full grades are withheld')
    g.add_argument('condition_json');g.add_argument('--graders',nargs='+',choices=['psa','cgc','bgs'],default=['psa','cgc','bgs'])
    i=sub.add_parser('inspect',help='Inspect image quality and propose an outline')
    i.add_argument('image');i.add_argument('--out',type=Path)
    args=parser.parse_args()
    try:
        if args.cmd=='grade':
            p=Path(args.condition_json)
            if p.stat().st_size>2*1024*1024:raise ValueError('Condition JSON exceeds 2 MB')
            cv=ConditionVector.model_validate_json(p.read_text())
            out=[forecast(name,cv).model_dump(mode='json') for name in args.graders]
        else:
            p=Path(args.image)
            if p.stat().st_size>MAX_BYTES:raise ValueError('Image exceeds 25 MB')
            out=inspect_image(p.read_bytes())
        text=json.dumps(out,indent=2,allow_nan=False)
        if getattr(args,'out',None):args.out.write_text(text)
        else:print(text)
    except (ValueError,OSError,KeyError) as exc:parser.error(str(exc))

if __name__=='__main__':main()

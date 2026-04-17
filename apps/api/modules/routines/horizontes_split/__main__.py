"""CLI local: python -m modules.routines.horizontes_split <horizontes.dat> [--out-dir ...]"""
from __future__ import annotations

import argparse
from pathlib import Path

from modules.routines.horizontes_split.reader import load_horizontes_lines
from modules.routines.horizontes_split.transform import group_lines_by_horizon
from modules.routines.horizontes_split.writer import build_outputs


def main() -> None:
    p = argparse.ArgumentParser(
        description="Split horizontes.dat by Horizon name (stdout preview or write to dir).",
    )
    p.add_argument("input", type=Path, help="Path to horizontes.dat")
    p.add_argument("--out-dir", type=Path, help="Write .dat files here")
    args = p.parse_args()

    raw = args.input.read_bytes()
    lines = load_horizontes_lines(raw)
    grouped = group_lines_by_horizon(lines)
    outputs = build_outputs(grouped)

    if args.out_dir:
        args.out_dir.mkdir(parents=True, exist_ok=True)
        for name, content in outputs.items():
            (args.out_dir / name).write_text(content, encoding="utf-8")
        print(f"Wrote {len(outputs)} file(s) to {args.out_dir}")
    else:
        for name, content in outputs.items():
            print(f"=== {name} ===")
            print(content, end="")


if __name__ == "__main__":
    main()

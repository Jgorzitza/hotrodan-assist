import argparse
import asyncio
from pathlib import Path

from app.service_registry.registry import main_to_file


def parse_args():
    parser = argparse.ArgumentParser(description="Service registry snapshot CLI")
    parser.add_argument(
        "--out",
        default="coordination/service_snapshot.json",
        help="Output path for JSON snapshot",
    )
    return parser.parse_args()


def run() -> int:
    args = parse_args()
    output_path = str(Path(args.out))
    asyncio.run(main_to_file(output_path))
    print(f"Wrote service snapshot to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())

"""Simple command‑line entry point for the websec API tools."""

import argparse
import pkgutil
import importlib

# import the package to trigger its __init__ (which imports all submodules)
import exploits  # directory is treated as a package by having __init__.py


def build_parser():
    parser = argparse.ArgumentParser(prog="websec-api")
    subs = parser.add_subparsers(dest="tool")

    for _loader, name, _ in pkgutil.iter_modules(exploits.__path__):
        mod = importlib.import_module(f"exploits.{name}")
        if hasattr(mod, "register"):
            mod.register(subs)
        elif hasattr(mod, "main"):
            p = subs.add_parser(name)
            p.set_defaults(func=mod.main)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

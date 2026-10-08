#!/usr/bin/env python3
"""Atomically publish a report; complete field validation happens in the companion."""
import argparse
import json
import os
from pathlib import Path
import re
import tempfile


def publish(source, inbox):
    source = Path(source)
    inbox = Path(inbox).expanduser()
    if not inbox.is_absolute():
        raise ValueError('Use the absolute inbox path shown in the companion.')
    repo = Path(__file__).resolve().parents[4]
    if inbox.resolve().is_relative_to(repo):
        raise ValueError('The report inbox must be outside the plugin repository.')
    raw = source.read_bytes()
    if len(raw) > 256000:
        raise ValueError('Report exceeds 256 KB.')
    report = json.loads(raw)
    if not isinstance(report, dict):
        raise ValueError('The report must be a JSON object.')
    producer = report.get('producer', '')
    if (report.get('schemaVersion') != 1 or not isinstance(producer, str)
            or not re.fullmatch(r'[A-Za-z0-9._-]{1,80}', producer)
            or producer in ('__proto__', 'prototype', 'constructor')
            or not isinstance(report.get('alerts'), list)):
        raise ValueError('Invalid report envelope; use report contract version 1.')
    inbox.mkdir(parents=True, exist_ok=True, mode=0o700)
    destination = inbox / (producer + '.json')
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=inbox, prefix='.report-', suffix='.tmp', delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(raw)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, destination)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('--inbox', required=True)
    args = parser.parse_args()
    try:
        print(publish(args.source, args.inbox))
    except (OSError, ValueError, TypeError) as error:
        parser.exit(1, f'Not published: {error}\n')

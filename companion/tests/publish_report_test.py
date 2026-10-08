import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('publisher', ROOT / 'chief-of-staff/skills/companion-notify/scripts/publish_report.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class PublishReportTests(unittest.TestCase):
    def test_atomic_replace_and_private_modes(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'report.json'
            source.write_text((ROOT / 'docs/example-report.json').read_text())
            inbox = Path(directory) / 'inbox'
            destination = publisher.publish(source, inbox)
            self.assertEqual(json.loads(destination.read_text())['schemaVersion'], 1)
            self.assertEqual(destination.stat().st_mode & 0o777, 0o600)
            content = json.loads(source.read_text())
            content['alerts'][0]['revision'] = 2
            source.write_text(json.dumps(content))
            publisher.publish(source, inbox)
            self.assertEqual(json.loads(destination.read_text())['alerts'][0]['revision'], 2)
            self.assertEqual(len(list(inbox.iterdir())), 1)

    def test_reject_public_destination_and_invalid_envelopes(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'report.json'
            source.write_text('[]')
            with self.assertRaises(ValueError):
                publisher.publish(source, Path(directory) / 'inbox')
            with self.assertRaises(ValueError):
                publisher.publish(source, ROOT / 'private-data')
            with self.assertRaises(ValueError):
                publisher.publish(source, Path('relative'))


if __name__ == '__main__':
    unittest.main()

import importlib.util
import plistlib
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / 'verify_ios_push_entitlements.py'
spec = importlib.util.spec_from_file_location('verify_ios_push_entitlements', SCRIPT)
verifier = importlib.util.module_from_spec(spec) if SCRIPT.exists() else None
if verifier:
    spec.loader.exec_module(verifier)


class VerifyIosPushEntitlementsTest(unittest.TestCase):
    def setUp(self):
        self.assertTrue(SCRIPT.exists(), 'IPA verification script is missing')
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.ipa = Path(self.tmp.name) / 'KeyFi.ipa'
        with zipfile.ZipFile(self.ipa, 'w') as archive:
            archive.writestr('Payload/KeyFi.app/embedded.mobileprovision', b'profile')

    def verify(self, signed='production', profile='production'):
        outputs = [
            plistlib.dumps({'aps-environment': signed} if signed else {}),
            plistlib.dumps({'Entitlements': {'aps-environment': profile} if profile else {}}),
        ]

        def run(command, **kwargs):
            class Result:
                returncode = 0
                stdout = outputs.pop(0)
                stderr = b''
            return Result()

        with patch.object(verifier.subprocess, 'run', side_effect=run):
            return verifier.verify_ipa(self.ipa)

    def test_accepts_production_entitlement_in_both_signed_artifacts(self):
        self.assertTrue(self.verify())

    def test_rejects_missing_or_nonproduction_values(self):
        for signed, profile in [('', 'production'), ('development', 'production'),
                                ('production', ''), ('production', 'development')]:
            with self.subTest(signed=signed, profile=profile):
                with self.assertRaises(ValueError):
                    self.verify(signed, profile)

    def test_rejects_missing_profile(self):
        with zipfile.ZipFile(self.ipa, 'w') as archive:
            archive.writestr('Payload/KeyFi.app/Info.plist', b'plist')
        with self.assertRaises(ValueError):
            self.verify()


if __name__ == '__main__':
    unittest.main()

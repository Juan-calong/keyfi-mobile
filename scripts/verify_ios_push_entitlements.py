#!/usr/bin/env python3
"""Fail an App Store build unless its signed app and profile both enable production APNs."""

import glob
import plistlib
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path


def read_plist(command):
    result = subprocess.run(command, capture_output=True, check=False)
    if result.returncode != 0:
        raise ValueError('Could not read signed iOS entitlements')
    try:
        return plistlib.loads(result.stdout)
    except (ValueError, TypeError, plistlib.InvalidFileException) as exc:
        raise ValueError('Could not parse signed iOS entitlements') from exc


def verify_ipa(ipa_path):
    with tempfile.TemporaryDirectory() as temporary:
        with zipfile.ZipFile(ipa_path) as archive:
            apps = {name.split('/')[1] for name in archive.namelist()
                    if name.startswith('Payload/') and name.count('/') >= 2
                    and name.split('/')[1].endswith('.app')}
            if len(apps) != 1:
                raise ValueError('IPA must contain exactly one Payload app')
            app_name = apps.pop()
            profile_entry = f'Payload/{app_name}/embedded.mobileprovision'
            if profile_entry not in archive.namelist():
                raise ValueError('Signed app has no embedded provisioning profile')
            archive.extractall(temporary)

        app = Path(temporary) / 'Payload' / app_name
        signed = read_plist(['codesign', '-d', '--entitlements', ':-', str(app)])
        profile = read_plist(['security', 'cms', '-D', '-i', str(app / 'embedded.mobileprovision')])
        signed_environment = signed.get('aps-environment')
        profile_environment = profile.get('Entitlements', {}).get('aps-environment')
        if signed_environment != 'production' or profile_environment != 'production':
            raise ValueError('Signed app and provisioning profile must both use production APNs')

    print('Signed app aps-environment: production')
    print('Provisioning profile aps-environment: production')
    print('iOS push entitlement verification: PASS')
    return True


def main():
    if len(sys.argv) != 2:
        raise ValueError('Expected IPA output directory')
    ipa_files = glob.glob(str(Path(sys.argv[1]) / '*.ipa'))
    if len(ipa_files) != 1:
        raise ValueError('Expected exactly one signed IPA')
    verify_ipa(ipa_files[0])


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f'iOS push entitlement verification: FAIL ({error})', file=sys.stderr)
        sys.exit(1)

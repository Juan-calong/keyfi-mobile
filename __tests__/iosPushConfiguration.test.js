const fs = require('fs');
const path = require('path');

const ios = path.join(__dirname, '..', 'ios');
const project = fs.readFileSync(path.join(ios, 'KeyFi.xcodeproj/project.pbxproj'), 'utf8');

test('KeyFi target declares the Push Notifications capability', () => {
  expect(project).toMatch(/13B07F861A680F5B00A75B9A = \{[\s\S]*?SystemCapabilities = \{[\s\S]*?com\.apple\.Push = \{[\s\S]*?enabled = 1;/);
});

test.each([
  ['Debug', 'development'],
  ['Release', 'production'],
])('%s target signs with an %s APNs entitlement', (configuration, environment) => {
  const block = project.match(new RegExp(`/\\* ${configuration} \\*/ = \\{[\\s\\S]*?baseConfigurationReference = [^;]+;[\\s\\S]*?buildSettings = \\{([\\s\\S]*?)\\n\\t\\t\\t\\};`));
  expect(block).not.toBeNull();
  const setting = block[1].match(/CODE_SIGN_ENTITLEMENTS = ([^;]+);/);
  expect(setting).not.toBeNull();
  const entitlementPath = setting[1].replaceAll('"', '');
  const entitlement = fs.readFileSync(path.join(ios, entitlementPath), 'utf8');
  expect(entitlement).toMatch(new RegExp(`<key>aps-environment</key>\\s*<string>${environment}</string>`));
});

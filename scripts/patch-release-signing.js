// Prebuild regenerates ios/*.xcodeproj from scratch and pins Release's
// CODE_SIGN_IDENTITY to "iPhone Developer". With automatic signing, an explicit
// identity conflicts with the archive action's distribution signing, so the
// key must be stripped from the Release config after every `expo prebuild`
// (Debug keeps "iPhone Developer" for local runs).
const fs = require('fs');
const path = require('path');

const iosDir = path.join(__dirname, '..', 'ios');
const pbxprojPath = fs.readdirSync(iosDir)
  .filter((f) => f.endsWith('.xcodeproj'))
  .map((f) => path.join(iosDir, f, 'project.pbxproj'))[0];

if (!pbxprojPath || !fs.existsSync(pbxprojPath)) {
  console.error('project.pbxproj not found under ios/');
  process.exit(1);
}

let contents = fs.readFileSync(pbxprojPath, 'utf8');

const configBlockRe = /\t\t[0-9A-F]{24} \/\* (Debug|Release) \*\/ = \{[\s\S]*?\n\t\t\};/g;
let patched = 0;

contents = contents.replace(configBlockRe, (block, name) => {
  if (name !== 'Release') return block;
  const updated = block.replace(
    /\t+"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]" = "iPhone Developer";\n/g,
    ''
  );
  if (updated !== block) patched++;
  return updated;
});

if (patched === 0) {
  console.warn('No Release CODE_SIGN_IDENTITY lines removed (already patched or template changed?)');
} else {
  fs.writeFileSync(pbxprojPath, contents);
  console.log(`Removed explicit CODE_SIGN_IDENTITY from ${patched} Release config(s) so automatic signing can pick distribution certs.`);
}

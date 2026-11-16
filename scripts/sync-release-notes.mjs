import fs from 'node:fs';
const readmePath = 'README.md';
const data = JSON.parse(fs.readFileSync('release-notes.json', 'utf8'));
const packageVersion = Number(JSON.parse(fs.readFileSync('package.json', 'utf8')).version.split('.')[0]);
const releases = data.releases;
if (!Array.isArray(releases) || !releases.length) throw Error('Missing release notes');
const seen = new Set();
for (const {version, summary} of releases) {
  if (!/^v[0-9]+(?:[–-]v?[0-9]+)?$/.test(version) || !summary || /[\r\n|]/.test(summary) || seen.has(version)) throw Error('Invalid or duplicate release note: ' + version);
  seen.add(version);
}
if (releases[0].version !== 'v' + packageVersion) throw Error('Add a release note for v' + packageVersion + ' before shipping');
const text = fs.readFileSync(readmePath, 'utf8');
const start = '## Selected development milestones\n';
const end = '\nThe Git history and ';
const a = text.indexOf(start), b = text.indexOf(end, a);
if (a < 0 || b < 0) throw Error('README milestone section not found');
const table = '\n| Release | Highlights |\n| --- | --- |\n' + releases.map(({version, summary}) => '| **' + version + '** | ' + summary + ' |').join('\n') + '\n';
const next = text.slice(0, a) + table.trimStart() + text.slice(b);
if (process.argv.includes('--check')) {
  if (next !== text) throw Error('README release table is out of sync; run npm run docs:sync');
  console.log('README release history is current');
} else {
  fs.writeFileSync(readmePath, next);
  console.log('README release history synchronized');
}

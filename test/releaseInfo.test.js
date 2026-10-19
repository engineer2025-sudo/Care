import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { RELEASE_INFO } from '../src/lib/releaseInfo.js'

test('release inventory contains matching platform versions and a calendar date', async () => {
  assert.match(RELEASE_INFO.sourceSnapshotOn, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(RELEASE_INFO.sourceSnapshotOn, '2026-10-19')
  assert.deepEqual(RELEASE_INFO.targets.map(({ id }) => id), ['web', 'ios', 'android'])
  assert.deepEqual(RELEASE_INFO.targets.map(({ version, build }) => [version, build]), [
    ['1.5.1', null], ['3.8.0', '17'], ['1.9.0', '11'],
  ])
  const history = await readFile(new URL('../docs/version-history.md', import.meta.url), 'utf8')
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const androidGradle = await readFile(new URL('../android/app/build.gradle.kts', import.meta.url), 'utf8')
  const iosProject = await readFile(new URL('../ios/CareSphere.xcodeproj/project.pbxproj', import.meta.url), 'utf8')
  assert.ok(history.includes('2026-10-18'))
  assert.match(history, /no release dated June 2026 or earlier/)
  assert.equal(packageJson.version, RELEASE_INFO.targets[0].version)
  assert.match(androidGradle, new RegExp(`versionName = \\"${RELEASE_INFO.targets[2].version}\\"`))
  assert.match(androidGradle, new RegExp(`versionCode = ${RELEASE_INFO.targets[2].build}\\b`))
  assert.match(iosProject, new RegExp(`MARKETING_VERSION = \\"${RELEASE_INFO.targets[1].version}\\"`))
  assert.match(iosProject, new RegExp(`CURRENT_PROJECT_VERSION = \\"${RELEASE_INFO.targets[1].build}\\"`))
})

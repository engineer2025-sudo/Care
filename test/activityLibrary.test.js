import test from 'node:test'
import assert from 'node:assert/strict'
import { ACTIVITIES, CHOICE_ROUNDS, normalizeFavorites, toggleFavorite, filterActivities, matchesSearch } from '../src/lib/activityLibrary.js'
import { normalizePersistedValue, parseCareStorage } from '../src/lib/careStorage.js'
test('eleven unique activities and valid answer choices', () => {
  assert.equal(new Set(ACTIVITIES.map(a => a.id)).size, 11)
  for (const rounds of Object.values(CHOICE_ROUNDS)) for(const round of rounds) { assert.ok(round.answer >= 0 && round.answer < round.options.length); assert.ok(round.hint) }
})
test('favorites normalize, persist and toggle without foreign ids', () => {
  assert.deepEqual(normalizeFavorites(['breathing','breathing','invented',null]),['breathing'])
  assert.deepEqual(normalizeFavorites({}), [])
  assert.deepEqual(toggleFavorite('breathing', ['breathing']), [])
  assert.deepEqual(toggleFavorite('unknown', []), [])
  assert.deepEqual(normalizePersistedValue('favoriteActivities', ['soundscapes','unknown'], []),['soundscapes'])
  assert.deepEqual(parseCareStorage('{"favoriteActivities":["breathing"]}').favoriteActivities,['breathing'])
})
test('library combines category, query and favorite filters', () => {
  assert.equal(filterActivities({ favoritesOnly: true }).length,0)
  assert.deepEqual(filterActivities({ favoritesOnly:true, favorites:['breathing'], category:'calm', query:'PACE' }).map(a => a.id), ['breathing'])
  assert.equal(filterActivities({ query:'not-an-activity' }).length,0)
})
test('care note search folds accents and requires every word', () => {
  assert.equal(matchesSearch('Ask about café meeting', ' CAFE ask '),true)
  assert.equal(matchesSearch('Ask about meeting', 'tomorrow meeting'),false)
  assert.equal(matchesSearch('anything',' '),true)
})
test('legacy note metadata survives while invalid edit dates are dropped', () => {
  const notes = normalizePersistedValue('notes', [{id:'1',note:'Original',date:'2026-01-01',author:'You'}, {id:'2',note:'Updated',editedAt:'2026-10-14T12:00:00Z'}, {id:'3',note:'Text',editedAt:'garbage'}],[])
  assert.equal(notes[0].note,'Original'); assert.equal(notes[0].editedAt,undefined)
  assert.equal(notes[1].editedAt,'2026-10-14T12:00:00Z'); assert.equal(notes[2].editedAt,undefined)
})

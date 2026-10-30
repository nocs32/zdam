// Merging progress from two devices: node --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { merge, canonical, emptyProgress } from '../src/sync/merge.ts'

const exam = (at) => ({ at, passed: true, reason: 'done', mistakes: 0, answered: 20, seconds: 600, items: [] })

test('the newer answer wins, per question', () => {
  const phone = { ...emptyProgress(), answers: { a: { ok: true, t: 5 }, b: { ok: false, t: 1 } } }
  const tablet = { ...emptyProgress(), answers: { a: { ok: false, t: 3 }, b: { ok: true, t: 9 }, c: { ok: true, t: 2 } } }
  const m = merge(phone, tablet)
  assert.deepEqual(m.answers, { a: { ok: true, t: 5 }, b: { ok: true, t: 9 }, c: { ok: true, t: 2 } })
})

test('a mistake cleared on one device stays cleared', () => {
  const phone = { ...emptyProgress(), mistakes: { q: { s: 2, t: 10, gone: true } } }
  const tablet = { ...emptyProgress(), mistakes: { q: { s: 1, t: 4 } } }
  assert.equal(merge(phone, tablet).mistakes.q.gone, true)
  assert.equal(merge(tablet, phone).mistakes.q.gone, true)
})

test('a newer mistake brings a cleared question back', () => {
  const phone = { ...emptyProgress(), mistakes: { q: { s: 2, t: 10, gone: true } } }
  const tablet = { ...emptyProgress(), mistakes: { q: { s: 0, t: 12 } } }
  assert.equal(merge(phone, tablet).mistakes.q.gone, undefined)
})

test('exams from both devices are kept once each, newest first', () => {
  const phone = { ...emptyProgress(), exams: [exam(3), exam(1)] }
  const tablet = { ...emptyProgress(), exams: [exam(2), exam(1)] }
  assert.deepEqual(merge(phone, tablet).exams.map((e) => e.at), [3, 2, 1])
})

test('merge is order-independent and idempotent', () => {
  const a = { ...emptyProgress(), answers: { x: { ok: true, t: 2 } }, learnPos: { 1: { i: 4, t: 7 } }, exams: [exam(5)] }
  const b = { ...emptyProgress(), answers: { x: { ok: false, t: 3 } }, learnPos: { 1: { i: 9, t: 6 } }, exams: [exam(6)] }
  assert.equal(canonical(merge(a, b)), canonical(merge(b, a)))
  assert.equal(canonical(merge(merge(a, b), b)), canonical(merge(a, b)))
})

'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const response = require('../../test-helpers/context').response

describe('res.header', () => {
  it('should return the response header object', () => {
    const res = response()
    res.set('X-Foo', 'bar')
    assert.deepStrictEqual(res.headers, { 'x-foo': 'bar' })
  })

  describe('when res._headers not present', () => {
    it('should return empty object', () => {
      const res = response()
      res.res._headers = null
      assert.deepStrictEqual(res.headers, {})
    })
  })
})

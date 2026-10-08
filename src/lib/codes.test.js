import { describe, expect, it } from 'vitest'
import { formatCode } from './codes.js'

describe('código de clase', () => {
  it('mayúsculas, sin espacios ni guiones de más, con el guion en medio y máximo 8', () => {
    expect(formatCode('abcd')).toBe('ABCD')
    expect(formatCode('abcd2')).toBe('ABCD-2')
    expect(formatCode(' ab-cd 23 45 ')).toBe('ABCD-2345')
    expect(formatCode('ABCD2345XYZ')).toBe('ABCD-2345')
  })
})

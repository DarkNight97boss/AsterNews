import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, hashPassword, passwordStrength, totpCode, verifyPassword, verifyTotp } from '../src/lib/security';

describe('password', () => {
  it('verifica la password corretta e rifiuta quella sbagliata', () => {
    const h = hashPassword('Redazione2026!');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('Redazione2026!', h)).toBe(true);
    expect(verifyPassword('redazione2026!', h)).toBe(false);
    expect(verifyPassword('x', null)).toBe(false);
  });
  it('genera hash diversi per la stessa password (salt casuale)', () => { expect(hashPassword('abc')).not.toBe(hashPassword('abc')); });
  it('richiede password robuste', () => {
    expect(passwordStrength('corta').ok).toBe(false);
    expect(passwordStrength('tuttominuscolo').ok).toBe(false);
    expect(passwordStrength('Lunga e valida 1').ok).toBe(true);
  });
});
describe('TOTP', () => {
  it('codifica e decodifica base32', () => { const buf = Buffer.from('ciao mondo'); expect(base32Decode(base32Encode(buf)).toString()).toBe('ciao mondo'); });
  it('accetta il codice corrente e rifiuta un codice a caso', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    expect(verifyTotp(secret, totpCode(secret))).toBe(true);
    expect(verifyTotp(secret, '000000') && verifyTotp(secret, '111111') && verifyTotp(secret, '222222')).toBe(false);
  });
  it('è compatibile con il vettore di test RFC 6238 (SHA1)', () => {
    // segreto "12345678901234567890" in base32, T = 59 s → passo 1 → codice 287082
    expect(totpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1)).toBe('287082');
  });
});

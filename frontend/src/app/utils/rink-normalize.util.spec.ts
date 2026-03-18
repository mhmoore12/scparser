import { normalizeRink } from './rink-normalize.util';

describe('normalizeRink', () => {
  it('normalizes prefix rules', () => {
    expect(normalizeRink('EU - Lehtinen Rink')).toBe('Euless');
    expect(normalizeRink('FB - Some Rink')).toBe('Farmers Branch');
    expect(normalizeRink('Farmers Branch North')).toBe('Farmers Branch');
    expect(normalizeRink('MA - Main')).toBe('Mansfield');
    expect(normalizeRink('MK Center')).toBe('McKinney');
    expect(normalizeRink('NL - 1')).toBe('Northlake');
    expect(normalizeRink('North Rink')).toBe('Northlake');
    expect(normalizeRink('PL West')).toBe('Plano');
    expect(normalizeRink('RC East')).toBe('Richardson');
    expect(normalizeRink('FR - Comerica')).toBe('Frisco');
  });

  it('handles special cases', () => {
    expect(normalizeRink('EU - Zubov Rink')).toBe('Euless');
    expect(normalizeRink('Lehtinen Rink')).toBe('Euless');
    expect(normalizeRink('Comerica Center Frisco')).toBe('Frisco');
  });
});

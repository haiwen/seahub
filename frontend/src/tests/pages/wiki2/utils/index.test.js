import { generatorBase64Code, generateUniqueId, getWikPageLink } from '../../../../pages/wiki2/utils/index.js';

describe('generatorBase64Code', () => {
  it('should generate a base64 code of length 4 by default', () => {
    const code = generatorBase64Code();
    expect(code.length).toBe(4);
  });
  it('should generate a base64 code of length 6 when given 6', () => {
    const code = generatorBase64Code(6);
    expect(code.length).toBe(6);
  });
  it('should generate a base64 code which is a string', () => {
    const code = generatorBase64Code();
    expect(typeof code).toBe('string');
  });
});

describe('generateUniqueId', () => {
  it('should generate a unique id', () => {
    const navigation = [
      { id: 'page1', children: [] },
      { id: 'page2', children: [{ id: 'page21', children: [] }] },
    ];
    expect(generateUniqueId(navigation)).not.toMatch(/page1|page2|page21/);
  });
  it('should generate a unique id with custom length', () => {
    const navigation = [
      { id: 'page1', children: [] },
      { id: 'page2', children: [{ id: 'page21', children: [] }] },
    ];
    expect(generateUniqueId(navigation, 6)).not.toMatch(/page1|page2|page21/);
    expect(generateUniqueId(navigation, 6).length).toBe(6);
  });
});

describe('getWikPageLink', () => {
  it('returns the correct URL', () => {
    const serviceURL = 'https://cloud.seafile.com';
    const url = 'https://cloud.seafile.com/wikis/6cbbded99bd272796a2/7Lj3/';
    const pageId = 'y4Jw';
    const expectedUrl = 'https://cloud.seafile.com/wikis/6cbbded99bd272796a2/y4Jw/';
    expect(getWikPageLink(serviceURL, url, pageId)).toBe(expectedUrl);
  });
});

describe('getWikPageLink', () => {
  it('returns the correct URL', () => {
    const serviceURL = 'https://dev.seafile.com/seahub';
    const url = 'https://dev.seafile.com/seahub/wikis/6cbbded99bd272796a2/7Lj3/';
    const pageId = 'y4Jw';
    const expectedUrl = 'https://dev.seafile.com/seahub/wikis/6cbbded99bd272796a2/y4Jw/';
    expect(getWikPageLink(serviceURL, url, pageId)).toBe(expectedUrl);
  });
});

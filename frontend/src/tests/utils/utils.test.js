import { Utils } from '@/utils/utils';

jest.mock('../../components/icon', () => ({
  __esModule: true,
  default: () => null,
}));

describe('getFileExtension', () => {
  it('should return the file extension with dot', () => {
    const fileName = 'document.pdf';
    const result = Utils.getFileExtension(fileName, false);
    expect(result).toBe('.pdf');
  });
  it('should return the file extension without dot', () => {
    const fileName = 'image.jpeg';
    const result = Utils.getFileExtension(fileName, true);
    expect(result).toBe('jpeg');
  });
  it('should handle filenames with multiple dots', () => {
    const fileName = 'archive.tar.gz';
    const resultWithDot = Utils.getFileExtension(fileName, false);
    const resultWithoutDot = Utils.getFileExtension(fileName, true);
    expect(resultWithDot).toBe('.gz');
    expect(resultWithoutDot).toBe('gz');
  });
  it('should handle filenames with upper case extensions', () => {
    const fileName = 'movie.MP4';
    const result = Utils.getFileExtension(fileName, true);
    expect(result).toBe('mp4');
  });
  it('should handle file name with special characters', () => {
    const fileName = '/repo/349d72de-e342-4461-a10a-45265c9cb4c2/raw/HEIC/arec4-j1qmq%20(1).heic';
    const result = Utils.getFileExtension(fileName, true);
    expect(result).toBe('heic');
  });
});

describe('generatePassword', () => {
  // DEL (0x7f) is invisible and may be lost when the password is copied into
  // email or chat, so generated passwords must stay printable ASCII.
  it('should only use printable ASCII characters between 33 and 126', () => {
    for (let i = 0; i < 2000; i++) {
      expect(Utils.generatePassword(12)).toMatch(/^[\x21-\x7e]{12}$/);
    }
  });
});

describe('bytesToSize', () => {
  it('should return empty string if bytes is undefined', () => {
    const result = Utils.bytesToSize(undefined);
    expect(result).toBe(' ');
  });
  it('should return double dash if bytes is negative', () => {
    const result = Utils.bytesToSize(-1);
    expect(result).toBe('--');
  });
  it('should return bytes with unit if bytes is 0', () => {
    const result = Utils.bytesToSize(0);
    expect(result).toBe('0 B');
  });
  it('should return bytes with unit if bytes is positive', () => {
    const result = Utils.bytesToSize(1000);
    expect(result).toBe('1.0 KB');
  });
  it('should handle different units', () => {
    const result = Utils.bytesToSize(1000 * 1000);
    expect(result).toBe('1.0 MB');
  });
  it('should handle different units', () => {
    const result = Utils.bytesToSize(1000 * 1000 * 1000);
    expect(result).toBe('1.0 GB');
  });
  it('should handle different units', () => {
    const result = Utils.bytesToSize(1000 * 1000 * 1000 * 1000);
    expect(result).toBe('1.0 TB');
  });
});

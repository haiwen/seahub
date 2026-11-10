import Dirent from '@/models/dirent';
import TextTranslation from '@/utils/text-translation';
import { Utils } from '@/utils/utils';
import { getBatchMenuList, getDirentItemMenuList } from './contextMenuUtils';

jest.mock('@/components/toast', () => ({ danger: jest.fn() }));

const repoInfo = { owner_email: 'owner@example.com' };
const folder = { type: 'dir', name: 'folder', permission: 'rw' };
const protectedFolder = { ...folder, write_protected: true };
const keys = (items) => items.filter(item => item !== 'Divider').map(item => item.key);

test('protected navigation folders expose no operations', () => {
  expect(keys(getDirentItemMenuList(repoInfo, protectedFolder))).toEqual([]);
  expect(keys(getDirentItemMenuList(repoInfo, { ...protectedFolder, starred: true })))
    .toEqual([]);
  expect(Utils.canDeleteFile(protectedFolder)).toBe(false);
  expect(Utils.canDownloadFile(protectedFolder)).toBe(false);
});

test('mixed selections cannot operate on protected navigation folders', () => {
  expect(getBatchMenuList(repoInfo, 'rw', [folder, protectedFolder], jest.fn())).toEqual([]);
});

test('single protected selection uses the protected item menu', () => {
  const getItemMenuList = item => getDirentItemMenuList(repoInfo, item);
  expect(keys(getBatchMenuList(repoInfo, 'rw', [protectedFolder], getItemMenuList)))
    .toEqual([]);
});

test('ordinary writable folders retain their operations', () => {
  const operations = keys(getDirentItemMenuList(repoInfo, folder));
  expect(operations).toContain(TextTranslation.RENAME.key);
  expect(operations).toContain(TextTranslation.DELETE.key);
  expect(operations).toContain(TextTranslation.MOVE.key);
});

test('directory models preserve protection when cloned and serialized', () => {
  const dirent = new Dirent(protectedFolder);
  expect(dirent.clone().write_protected).toBe(true);
  expect(dirent.toJson().write_protected).toBe(true);
  expect(new Dirent(folder).write_protected).toBe(false);
});

import getTreeNodeMenuList from '@/components/tree-view/get-tree-node-menu-list';
import Dirent from '@/models/dirent';
import TextTranslation from '@/utils/text-translation';
import { Utils } from '@/utils/utils';
import { getBatchMenuList, getDirentItemMenuList } from './contextMenuUtils';

jest.mock('@/components/toast', () => ({ danger: jest.fn() }));

const repoInfo = { owner_email: 'owner@example.com' };
const folder = { type: 'dir', name: 'folder', permission: 'rw' };
const protectedFolder = { ...folder, permission: 'navigate' };
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
  expect(dirent.clone().permission).toBe('navigate');
  expect(dirent.toJson().permission).toBe('navigate');
  expect(new Dirent(folder).permission).toBe('rw');
});

test('tree menus expose no operations for navigate regardless of library permission', () => {
  expect(getTreeNodeMenuList({ object: protectedFolder }, 'rw', repoInfo)).toEqual([]);
  expect(getTreeNodeMenuList({ object: protectedFolder }, 'r', repoInfo)).toEqual([]);
});

import {
  DEFAULT_WIKI_COLOR,
  DEFAULT_WIKI_ICON,
  WIKI_HOMEPAGE_ICONS,
  WIKI_ICON_CATEGORIES,
} from './constants';

const WIKI_ICONS = WIKI_ICON_CATEGORIES.flatMap(category => category.icons);
const WIKI_ICON_SET = new Set(WIKI_ICONS);

const normalizeWikiIconSearchValue = (value) => {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
};

const filterWikiIcons = (searchValue) => {
  const normalizedSearchValue = normalizeWikiIconSearchValue(searchValue.trim());
  if (!normalizedSearchValue) {
    return WIKI_ICONS;
  }

  return WIKI_ICONS.filter(icon => {
    const searchableName = normalizeWikiIconSearchValue(
      icon.replace(/-fill$/, '').replace(/-/g, ' ')
    );
    return searchableName.includes(normalizedSearchValue);
  });
};

const resolveWikiColor = (color) => {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_WIKI_COLOR;
};

const resolveWikiIcon = (icon) => {
  return WIKI_ICON_SET.has(icon) ? icon : DEFAULT_WIKI_ICON;
};

const isHomepageWikiIcon = (icon) => {
  return WIKI_HOMEPAGE_ICONS.includes(resolveWikiIcon(icon));
};

const getDisplayedWikiIcons = (pinnedIcon) => {
  const resolvedPinnedIcon = resolveWikiIcon(pinnedIcon);
  if (pinnedIcon && !isHomepageWikiIcon(resolvedPinnedIcon)) {
    return [resolvedPinnedIcon, ...WIKI_HOMEPAGE_ICONS];
  }
  return WIKI_HOMEPAGE_ICONS;
};

export {
  filterWikiIcons,
  getDisplayedWikiIcons,
  isHomepageWikiIcon,
  resolveWikiColor,
  resolveWikiIcon,
};

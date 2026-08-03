import wikiIconManifest from '../../assets/wiki-icon/manifest.json';

const DEFAULT_WIKI_ICON = wikiIconManifest.defaultIcon;
const DEFAULT_WIKI_COLOR = '#FF8000';

const WIKI_ICON_COLORS = [
  '#FF8000',
  '#FFAA00',
  '#F84B5C',
  '#F500A0',
  '#8B3DFF',
  '#B735D7',
  '#34C759',
  '#2BC49A',
  '#12AEE2',
  '#06B6B7',
  '#2B8FF7',
  '#5A534D',
];

const WIKI_ICON_CATEGORIES = wikiIconManifest.categories;
const WIKI_HOMEPAGE_ICONS = wikiIconManifest.homepageIcons;
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
  DEFAULT_WIKI_COLOR,
  DEFAULT_WIKI_ICON,
  filterWikiIcons,
  getDisplayedWikiIcons,
  isHomepageWikiIcon,
  resolveWikiIcon,
  WIKI_HOMEPAGE_ICONS,
  WIKI_ICON_CATEGORIES,
  WIKI_ICON_COLORS,
};

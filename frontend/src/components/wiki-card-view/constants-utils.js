import {
  DEFAULT_WIKI_COLOR,
  DEFAULT_WIKI_ICON,
  WIKI_HOMEPAGE_ICONS,
  WIKI_ICON_CATEGORIES,
} from './constants';
import { gettext } from '../../utils/constants';

const WIKI_ICON_OPTIONS = WIKI_ICON_CATEGORIES.flatMap(category => category.icons);
const WIKI_ICON_OPTIONS_BY_ID = new Map(WIKI_ICON_OPTIONS.map(option => [option.icon, option]));
const WIKI_ICONS = WIKI_ICON_OPTIONS.map(({ icon }) => icon);
const WIKI_ICON_SET = new Set(WIKI_ICONS);
const AI_SUGGESTED_ICON_PAGE_SIZE = 5;

const normalizeWikiIconSearchValue = (value) => {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
};

const filterWikiIconOptions = (searchValue) => {
  const normalizedSearchValue = normalizeWikiIconSearchValue(searchValue.trim());
  if (!normalizedSearchValue) {
    return WIKI_ICON_OPTIONS;
  }

  return WIKI_ICON_OPTIONS.filter(({ icon }) => {
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

const isWikiIcon = (icon) => WIKI_ICON_SET.has(icon);

const normalizeSuggestedIcons = (icons) => {
  const seen = new Set();
  return (Array.isArray(icons) ? icons : []).reduce((results, item) => {
    const rawIconName = typeof item === 'string' ? item : item && item.icon;
    const iconName = typeof rawIconName === 'string' ? rawIconName.trim() : '';
    const iconOption = WIKI_ICON_OPTIONS_BY_ID.get(iconName);
    if (!iconName || !iconOption || seen.has(iconName)) return results;

    seen.add(iconName);
    results.push(iconOption);
    return results;
  }, []);
};

const getWikiAiCustomMessageParts = (message) => {
  const [before = '', after = ''] = message.split('{custom}');
  return [before.replace(/\s+$/, ''), after.replace(/^\s+/, '')];
};

const getWikiAiErrorMessage = (errorMsg) => {
  switch (errorMsg) {
    case 'AI server not configured':
      return gettext('AI server not configured');
    case 'Credit not enough':
      return gettext('Credit not enough');
    case 'Internal Server Error':
      return gettext('Internal Server Error');
    default:
      return gettext('Error');
  }
};

const getSuggestedIconPage = (icons, pageIndex) => {
  const startIndex = pageIndex * AI_SUGGESTED_ICON_PAGE_SIZE;
  return icons.slice(startIndex, startIndex + AI_SUGGESTED_ICON_PAGE_SIZE);
};

const isHomepageWikiIcon = (icon) => {
  return WIKI_HOMEPAGE_ICONS.includes(resolveWikiIcon(icon));
};

const getDisplayedWikiIconOptions = (pinnedIcon) => {
  const resolvedPinnedIcon = resolveWikiIcon(pinnedIcon);
  const displayedIcons = pinnedIcon && !isHomepageWikiIcon(resolvedPinnedIcon)
    ? [resolvedPinnedIcon, ...WIKI_HOMEPAGE_ICONS]
    : WIKI_HOMEPAGE_ICONS;
  return displayedIcons.map(icon => WIKI_ICON_OPTIONS_BY_ID.get(icon)).filter(Boolean);
};

export {
  AI_SUGGESTED_ICON_PAGE_SIZE,
  filterWikiIconOptions,
  getDisplayedWikiIconOptions,
  getSuggestedIconPage,
  getWikiAiCustomMessageParts,
  getWikiAiErrorMessage,
  isWikiIcon,
  isHomepageWikiIcon,
  normalizeSuggestedIcons,
  resolveWikiColor,
  resolveWikiIcon,
};

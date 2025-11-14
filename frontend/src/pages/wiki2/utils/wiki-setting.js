const { wikiSettings, repos, wikiId } = window.wiki.config;
const WIKI_SETTING_INTO_KEY = `seafile_wiki_${wikiId}_settings_info`;
const WIKI_REPO_INFO_KEY = `seafile_wiki_${wikiId}_repos_info`;

export const initWikiSettingsAndRepos = () => {
  const savedSettings = window.localStorage.getItem(WIKI_SETTING_INTO_KEY);
  const savedRepos = window.localStorage.getItem(WIKI_REPO_INFO_KEY);
  if (savedSettings) {
    window.localStorage.removeItem(WIKI_SETTING_INTO_KEY);
  }
  if (savedRepos) {
    window.localStorage.removeItem(WIKI_REPO_INFO_KEY);
  }
  window.localStorage.setItem(WIKI_SETTING_INTO_KEY, JSON.stringify(wikiSettings));
  window.localStorage.setItem(WIKI_REPO_INFO_KEY, JSON.stringify(repos));
};

export const getWikiSettings = () => {
  const settings = window.localStorage.getItem(WIKI_SETTING_INTO_KEY);
  if (!settings) {
    throw new Error('Settings init error');
  }
  return JSON.parse(settings);
};

export const getWikiRepos = () => {
  const repos = window.localStorage.getItem(WIKI_REPO_INFO_KEY);
  if (!repos) {
    throw new Error('Repos init error');
  }
  return JSON.parse(repos);
};

export const saveWikiSettingsIntoStorage = (wikiSettings) => {
  window.localStorage.setItem(WIKI_SETTING_INTO_KEY, JSON.stringify(wikiSettings));
};


export const getWikiSettings = () => {
  const { wikiSettings } = window.wiki.config;

  return wikiSettings;
};

export const getWikiRepos = () => {
  const { repos } = window.wiki.config;
  return repos;
};

export const saveWikiSettingsIntoStorage = (wikiSettings) => {
  if (window.wiki.config) {
    window.wiki.config['wikiSettings'] = wikiSettings;
  }
};


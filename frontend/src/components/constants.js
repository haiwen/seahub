export const dirPath = '/';
export const gettext = window.gettext;

export const siteRoot = window.app.config.siteRoot;
export const avatarInfo = window.app.config.avatarInfo;
export const logoPath =  window.app.config.logoPath;
export const mediaUrl = window.app.config.mediaUrl;
export const siteTitle = window.app.config.siteTitle;
export const logoWidth = window.app.config.logoWidth;
export const logoHeight = window.app.config.logoHeight;
export const isPro = window.app.config.isPro === "True";
export const lang = window.app.config.lang;

// wiki
export const slug = window.wiki ? window.wiki.config.slug : '';
export const repoID = window.wiki ? window.wiki.config.repoId : '';
export const serviceUrl = window.wiki ? window.wiki.config.serviceUrl : '';
export const initialFilePath = window.wiki ? window.wiki.config.initial_file_path : '';
export const permission = window.wiki ? window.wiki.config.permission : '';


// file history
export const PER_PAGE = 25;
export const historyRepoID = window.fileHistory ? window.fileHistory.pageOptions.repoID : '';
export const repoName = window.fileHistory ? window.fileHistory.pageOptions.repoName : '';
export const filePath = window.fileHistory ? window.fileHistory.pageOptions.filePath : '';
export const fileName = window.fileHistory ? window.fileHistory.pageOptions.fileName : '';

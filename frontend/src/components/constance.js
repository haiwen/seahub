let slug, repoID, serviceUrl, initialFilePath;

export const dirPath = '/';
export const gettext = window.gettext;

export const siteRoot = window.app.config.siteRoot;
export const avatarInfo = window.app.config.avatarInfo;
export const logoPath =  window.app.config.logoPath;
export const mediaUrl = window.app.config.mediaUrl;
export const siteTitle = window.app.config.siteTitle;
export const logoWidth = window.app.config.logoWidth;
export const logoHeight = window.app.config.logoHeight;

if (window.wiki) {
  slug = window.wiki.config.slug;
  repoID = window.wiki.config.repoId;
  serviceUrl = window.wiki.config.serviceUrl;
  initialFilePath = window.wiki.config.initial_file_path;
}

export { slug, repoID, serviceUrl, initialFilePath }

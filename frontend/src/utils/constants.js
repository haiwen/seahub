export const dirPath = '/';
export const gettext = window.gettext;

export const siteRoot = window.app.config.siteRoot;
export const loginUrl = window.app.config.loginUrl;
export const avatarInfo = window.app.config.avatarInfo;
export const logoPath =  window.app.config.logoPath;
export const mediaUrl = window.app.config.mediaUrl;
export const siteTitle = window.app.config.siteTitle;
export const logoWidth = window.app.config.logoWidth;
export const logoHeight = window.app.config.logoHeight;
export const isPro = window.app.config.isPro === 'True';
export const lang = window.app.config.lang;
export const fileServerRoot = window.app.config.fileServerRoot;

//pageOptions
export const canGenerateShareLink = window.app.pageOptions.canGenerateShareLink === 'True';
export const canGenerateUploadLink = window.app.pageOptions.canGenerateUploadLink === 'True';
export const fileAuditEnabled = window.app.pageOptions.fileAuditEnabled ? true : false;
export const enableFileComment = window.app.pageOptions.enableFileComment ? true : false;
export const folderPermEnabled = window.app.pageOptions.folderPermEnabled === 'True';
// wiki
export const slug = window.wiki ? window.wiki.config.slug : '';
export const repoID = window.wiki ? window.wiki.config.repoId : '';
export const serviceUrl = window.wiki ? window.wiki.config.serviceUrl : '';
export const initialFilePath = window.wiki ? window.wiki.config.initial_file_path : '';
export const permission = window.wiki ? window.wiki.config.permission === 'True' : '';

// file history
export const PER_PAGE = 25;
export const historyRepoID = window.fileHistory ? window.fileHistory.pageOptions.repoID : '';
export const repoName = window.fileHistory ? window.fileHistory.pageOptions.repoName : '';
export const filePath = window.fileHistory ? window.fileHistory.pageOptions.filePath : '';
export const fileName = window.fileHistory ? window.fileHistory.pageOptions.fileName : '';

// Draft review
export const draftFilePath = window.draftReview ? window.draftReview.config.draftFilePath: '';
export const draftOriginFilePath = window.draftReview ? window.draftReview.config.draftOriginFilePath: '';
export const draftOriginRepoID = window.draftReview ? window.draftReview.config.draftOriginRepoID: '';
export const draftFileName = window.draftReview ? window.draftReview.config.draftFileName: '';
export const reviewID = window.draftReview ? window.draftReview.config.reviewID : '';
export const draftID = window.draftReview ? window.draftReview.config.draftID : '';
export const opStatus = window.draftReview ? window.draftReview.config.opStatus : '';
export const publishFileVersion = window.draftReview ? window.draftReview.config.publishFileVersion : '';
export const originFileVersion = window.draftReview ? window.draftReview.config.originFileVersion : '';

export const dirPath = '/';
export const gettext = window.gettext;

export const siteRoot = window.app.config.siteRoot;
export const loginUrl = window.app.config.loginUrl;
export const avatarInfo = window.app.config.avatarInfo;
export const logoPath =  window.app.config.logoPath;
export const mediaUrl = window.app.config.mediaUrl;
export const siteTitle = window.app.config.siteTitle;
export const siteName = window.app.config.siteName;
export const logoWidth = window.app.config.logoWidth;
export const logoHeight = window.app.config.logoHeight;
export const isPro = window.app.config.isPro === 'True';
export const lang = window.app.config.lang;
export const fileServerRoot = window.app.config.fileServerRoot;
export const seafileVersion = window.app.config.seafileVersion;
export const serviceURL = window.app.config.serviceURL;

//pageOptions
export const seafileCollabServer = window.app.pageOptions.seafileCollabServer;
export const name = window.app.pageOptions.name;
export const contactEmail = window.app.pageOptions.contactEmail;
export const username = window.app.pageOptions.username;
export const canAddRepo = window.app.pageOptions.canAddRepo;
export const canGenerateShareLink = window.app.pageOptions.canGenerateShareLink;
export const canGenerateUploadLink = window.app.pageOptions.canGenerateUploadLink ? true : false;
export const canViewOrg = window.app.pageOptions.canViewOrg === 'True';
export const fileAuditEnabled = window.app.pageOptions.fileAuditEnabled ? true : false;
export const enableFileComment = window.app.pageOptions.enableFileComment ? true : false;
export const folderPermEnabled = window.app.pageOptions.folderPermEnabled === 'True';
export const enableResetEncryptedRepoPassword = window.app.pageOptions.enableResetEncryptedRepoPassword === 'True';
export const isEmailConfigured = window.app.pageOptions.isEmailConfigured === 'True';
export const enableUploadFolder = window.app.pageOptions.enableUploadFolder === 'True';
export const enableResumableFileUpload = window.app.pageOptions.enableResumableFileUpload === 'True';
export const storages = window.app.pageOptions.storages; // storage backends
export const enableRepoSnapshotLabel = window.app.pageOptions.enableRepoSnapshotLabel;
export const shareLinkExpireDaysMin = window.app.pageOptions.shareLinkExpireDaysMin;
export const shareLinkExpireDaysMax = window.app.pageOptions.shareLinkExpireDaysMax;
export const maxFileName = window.app.pageOptions.maxFileName;
export const enableWiki = window.app.pageOptions.enableWiki;
export const enableEncryptedLibrary = window.app.pageOptions.enableEncryptedLibrary === '1';
export const enableRepoHistorySetting = window.app.pageOptions.enableRepoHistorySetting === '1';
export const isSystemStaff = window.app.pageOptions.isSystemStaff;
export const thumbnailSizeForOriginal = window.app.pageOptions.thumbnailSizeForOriginal;
export const repoPasswordMinLength = window.app.pageOptions.repoPasswordMinLength;

// wiki
export const slug = window.wiki ? window.wiki.config.slug : '';
export const repoID = window.wiki ? window.wiki.config.repoId : '';
export const initialPath = window.wiki ? window.wiki.config.initial_path : '';
export const permission = window.wiki ? window.wiki.config.permission === 'True' : '';
export const isDir = window.wiki ? window.wiki.config.isDir : '';
export const serviceUrl = window.wiki ? window.wiki.config.serviceUrl : '';
export const isPublicWiki = window.wiki ? window.wiki.config.isPublicWiki === 'True': '';

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
export const reviewPerm = window.draftReview ? window.draftReview.config.perm : '';
export const publishFileVersion = window.draftReview ? window.draftReview.config.publishFileVersion : '';
export const originFileVersion = window.draftReview ? window.draftReview.config.originFileVersion : '';
export const author = window.draftReview ? window.draftReview.config.author : '';
export const authorAvatar = window.draftReview ? window.draftReview.config.authorAvatar : '';
export const originFileExists = window.draftReview ? window.draftReview.config.originFileExists : '';
export const draftFileExists = window.draftReview ? window.draftReview.config.draftFileExists : '';

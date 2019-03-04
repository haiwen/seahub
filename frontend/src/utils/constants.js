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
export const draftFilePath = window.draft ? window.draft.config.draftFilePath: '';
export const draftOriginFilePath = window.draft ? window.draft.config.draftOriginFilePath: '';
export const draftOriginRepoID = window.draft ? window.draft.config.draftOriginRepoID: '';
export const draftFileName = window.draft ? window.draft.config.draftFileName: '';
export const draftID = window.draft ? window.draft.config.draftID : '';
export const draftRepoID = window.draft ? window.draft.config.draftRepoID : '';
export const opStatus = window.draft ? window.draft.config.opStatus : '';
export const publishFileVersion = window.draft ? window.draft.config.publishFileVersion : '';
export const originFileVersion = window.draft ? window.draft.config.originFileVersion : '';
export const author = window.draft ? window.draft.config.author : '';
export const authorAvatar = window.draft ? window.draft.config.authorAvatar : '';
export const originFileExists = window.draft ? window.draft.config.originFileExists : '';
export const draftFileExists = window.draft ? window.draft.config.draftFileExists : '';

// org admin
export const orgID = window.org ? window.org.pageOptions.orgID : '';

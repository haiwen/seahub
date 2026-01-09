export const defaultContentForSDoc = {
  version: 0,
  children: [{ id: 'aaaa', type: 'paragraph', children: [{ text: '' }] }]
};

export const dirPath = '/';
export const gettext = window.gettext || ((str) => str);

export const internalFilePath = '/_Internal/seatable-integration.json';

// for unit test global variable
if (!window.app) {
  window.app = {};
  window.app.config = {};
  window.app.pageOptions = {};
}

export const siteRoot = window.app.config.siteRoot;
export const loginUrl = window.app.config.loginUrl;
export const avatarInfo = window.app.config.avatarInfo;
export const logoPath = window.app.config.logoPath;
export const mediaUrl = window.app.config.mediaUrl;
export const siteTitle = window.app.config.siteTitle;
export const siteName = window.app.config.siteName;
export const logoWidth = window.app.config.logoWidth;
export const logoHeight = window.app.config.logoHeight;
export const isPro = window.app.config.isPro === 'True';
export const isDBSqlite3 = window.app.config.isDBSqlite3;
export const lang = window.app.config.lang;
export const fileServerRoot = window.app.config.fileServerRoot;
export const useGoFileserver = window.app.config.useGoFileserver;
export const seafileVersion = window.app.config.seafileVersion;
export const serviceURL = window.app.config.serviceURL;
export const enableNotificationServer = window.app.config.enableNotificationServer;
export const notificationServerUrl = window.app.config.notificationServerUrl;
export const appAvatarURL = window.app.config.avatarURL;
export const faviconPath = window.app.config.faviconPath;
export const loginBGPath = window.app.config.loginBGPath;
export const enableRepoAutoDel = window.app.config.enableRepoAutoDel;
export const cloudMode = window.app.pageOptions.cloudMode;
export const isOrgContext = window.app.pageOptions.isOrgContext;

// pageOptions
export const trashReposExpireDays = window.app.pageOptions.trashReposExpireDays;
export const name = window.app.pageOptions.name;
export const contactEmail = window.app.pageOptions.contactEmail;
export const username = window.app.pageOptions.username;
export const canAddRepo = window.app.pageOptions.canAddRepo;
export const canShareRepo = window.app.pageOptions.canShareRepo;
export const canAddGroup = window.app.pageOptions.canAddGroup;
export const groupImportMembersExtraMsg = window.app.pageOptions.groupImportMembersExtraMsg;
export const canGenerateShareLink = window.app.pageOptions.canGenerateShareLink;
export const canGenerateUploadLink = window.app.pageOptions.canGenerateUploadLink;
export const canSendShareLinkEmail = window.app.pageOptions.canSendShareLinkEmail;
export const canViewOrg = window.app.pageOptions.canViewOrg === 'True';
export const fileAuditEnabled = window.app.pageOptions.fileAuditEnabled;
export const folderPermEnabled = window.app.pageOptions.folderPermEnabled;
export const enableResetEncryptedRepoPassword = window.app.pageOptions.enableResetEncryptedRepoPassword === 'True';
export const isEmailConfigured = window.app.pageOptions.isEmailConfigured === 'True';
export const enableUploadFolder = window.app.pageOptions.enableUploadFolder === 'True';
export const enableResumableFileUpload = window.app.pageOptions.enableResumableFileUpload === 'True';
export const resumableUploadFileBlockSize = window.app.pageOptions.resumableUploadFileBlockSize;
export const storages = window.app.pageOptions.storages; // storage backends
export const libraryTemplates = window.app.pageOptions.libraryTemplates; // library templates
export const enableRepoSnapshotLabel = window.app.pageOptions.enableRepoSnapshotLabel;
export const shareLinkForceUsePassword = window.app.pageOptions.shareLinkForceUsePassword;
export const shareLinkPasswordMinLength = window.app.pageOptions.shareLinkPasswordMinLength;
export const shareLinkPasswordStrengthLevel = window.app.pageOptions.shareLinkPasswordStrengthLevel;
export const shareLinkExpireDaysMin = window.app.pageOptions.shareLinkExpireDaysMin;
export const shareLinkExpireDaysMax = window.app.pageOptions.shareLinkExpireDaysMax;
export const sideNavFooterCustomHtml = window.app.pageOptions.sideNavFooterCustomHtml;
export const helpLink = window.app.pageOptions.helpLink;
export const aboutDialogCustomHtml = window.app.pageOptions.aboutDialogCustomHtml;
export const shareLinkExpireDaysDefault = window.app.pageOptions.shareLinkExpireDaysDefault;
export const uploadLinkExpireDaysMin = window.app.pageOptions.uploadLinkExpireDaysMin;
export const uploadLinkExpireDaysMax = window.app.pageOptions.uploadLinkExpireDaysMax;
export const uploadLinkExpireDaysDefault = window.app.pageOptions.uploadLinkExpireDaysDefault;
export const enableShareToDepartment = window.app.pageOptions.enableShareToDepartment;
export const maxFileName = window.app.pageOptions.maxFileName;
export const canCreateWiki = window.app.pageOptions.canCreateWiki;
export const canPublishWiki = window.app.pageOptions.canPublishWiki;
export const enableEncryptedLibrary = window.app.pageOptions.enableEncryptedLibrary;
export const enableRepoHistorySetting = window.app.pageOptions.enableRepoHistorySetting;
export const enableUserCleanTrash = window.app.pageOptions.enableUserCleanTrash;
export const isSystemStaff = window.app.pageOptions.isSystemStaff;
export const isSeafilePlus = window.app.pageOptions.isSeafilePlus;
export const thumbnailSizeForOriginal = window.app.pageOptions.thumbnailSizeForOriginal;
export const thumbnailDefaultSize = window.app.pageOptions.thumbnailDefaultSize;
export const thumbnailSizeForGrid = window.app.pageOptions.thumbnailSizeForGrid;
export const repoPasswordMinLength = window.app.pageOptions.repoPasswordMinLength;
export const canAddPublicRepo = window.app.pageOptions.canAddPublicRepo;
export const canInvitePeople = window.app.pageOptions.canInvitePeople;
export const canLockUnlockFile = window.app.pageOptions.canLockUnlockFile;
export const customNavItems = window.app.pageOptions.customNavItems;
export const enableShowContactEmailWhenSearchUser = window.app.pageOptions.enableShowContactEmailWhenSearchUser;
export const enableShowLoginIDWhenSearchUser = window.app.pageOptions.enableShowLoginIDWhenSearchUser;
export const maxUploadFileSize = window.app.pageOptions.maxUploadFileSize;
export const maxNumberOfFilesForFileupload = window.app.pageOptions.maxNumberOfFilesForFileupload;
export const enableOCM = window.app.pageOptions.enableOCM;
export const ocmRemoteServers = window.app.pageOptions.ocmRemoteServers;
export const enableOCMViaWebdav = window.app.pageOptions.enableOCMViaWebdav;
export const enableSSOToThirdpartWebsite = window.app.pageOptions.enableSSOToThirdpartWebsite;
export const enableSeadoc = window.app.pageOptions.enableSeadoc;
export const enableMetadataManagement = window.app.pageOptions.enableMetadataManagement;
export const enableSeafileAI = window.app.pageOptions.enableSeafileAI;
export const enableFaceRecognitionFeature = window.app.pageOptions.enableFaceRecognition;
export const enableWhiteboard = window.app.pageOptions.enableWhiteboard;
export const enableMultipleOfficeSuite = window.app.pageOptions.enableMultipleOfficeSuite;
export const officeSuiteEditFileExtension = window.app.pageOptions.officeSuiteEditFileExtension || [];

export const curNoteMsg = window.app.pageOptions.curNoteMsg;
export const curNoteID = window.app.pageOptions.curNoteID;

export const enableTC = window.app.pageOptions.enableTC;

export const enableVideoThumbnail = window.app.pageOptions.enableVideoThumbnail;
export const enablePDFThumbnail = window.app.pageOptions.enablePDFThumbnail;

export const enableOfficeWebApp = window.app.pageOptions.enableOfficeWebApp || false;
export const officeWebAppEditFileExtension = window.app.pageOptions.officeWebAppEditFileExtension || [];
export const enableOnlyoffice = window.app.pageOptions.enableOnlyoffice || false;
export const onlyofficeEditFileExtension = window.app.pageOptions.onlyofficeEditFileExtension || [];
export const onlyofficeSupportEditDocxf = window.app.pageOptions.onlyofficeSupportEditDocxf || false;
export const onlyofficeConverterExtensions = window.app.pageOptions.onlyofficeConverterExtensions || [];

export const isMultiTenancy = window.app.pageOptions.isMultiTenancy;
export const enableFileTags = window.app.pageOptions.enableFileTags || false;

export const enableShowAbout = window.app.pageOptions.enableShowAbout || false;

export const showWechatSupportGroup = window.app.pageOptions.showWechatSupportGroup || false;

// dtable
export const workspaceID = window.app.pageOptions.workspaceID;
export const showLogoutIcon = window.app.pageOptions.showLogoutIcon;
export const additionalShareDialogNote = window.app.pageOptions.additionalShareDialogNote;
export const additionalAboutDialogLinks = window.app.pageOptions.additionalAboutDialogLinks;

// map settings
export const baiduMapKey = window.app.pageOptions.baiduMapKey;
export const googleMapKey = window.app.pageOptions.googleMapKey;
export const googleMapId = window.app.pageOptions.googleMapId;
export const mineMapKey = window.app.pageOptions.mineMapKey;

// wiki
export const slug = window.wiki ? window.wiki.config.slug : '';
export const wikiId = window.wiki ? window.wiki.config.wikiId : '';
export const repoID = window.wiki ? window.wiki.config.repoId : '';
export const initialPath = window.wiki ? window.wiki.config.initial_path : '';
export const permission = window.wiki ? window.wiki.config.permission === 'True' : '';
export const wikiPermission = window.wiki ? window.wiki.config.permission : '';
export const isDir = window.wiki ? window.wiki.config.isDir : '';
export const serviceUrl = window.wiki ? window.wiki.config.serviceUrl : '';
export const isPublicWiki = window.wiki ? window.wiki.config.isPublicWiki === 'True' : '';
export const sharedToken = window.wiki ? window.wiki.config.sharedToken : '';
export const sharedType = window.wiki ? window.wiki.config.sharedType : '';
export const hasIndex = window.wiki ? window.wiki.config.hasIndex : '';
export const assetsUrl = window.wiki ? window.wiki.config.assetsUrl : '';
export const isWiki2 = window.wiki ? window.wiki.config.isWiki2 : false;
export const seadocServerUrl = window.wiki ? window.wiki.config.seadocServerUrl : '';
export const seadocAccessToken = window.wiki ? window.wiki.config.seadocAccessToken : '';

// file history
export const PER_PAGE = 25;
export const historyRepoID = window.fileHistory ? window.fileHistory.pageOptions.repoID : '';
export const repoName = window.fileHistory ? window.fileHistory.pageOptions.repoName : '';
export const filePath = window.fileHistory ? window.fileHistory.pageOptions.filePath : '';
export const fileName = window.fileHistory ? window.fileHistory.pageOptions.fileName : '';
export const useNewAPI = window.fileHistory ? window.fileHistory.pageOptions.use_new_api : '';
export const canDownload = window.fileHistory ? window.fileHistory.pageOptions.can_download_file : '';

// org admin
export const orgID = window.org ? window.org.pageOptions.orgID : '';
export const orgName = window.org ? window.org.pageOptions.orgName : '';
export const invitationLink = window.org ? window.org.pageOptions.invitationLink : '';
export const orgMemberQuotaEnabled = window.org ? window.org.pageOptions.orgMemberQuotaEnabled : '';
export const orgEnableAdminCustomLogo = window.org ? window.org.pageOptions.orgEnableAdminCustomLogo === 'True' : false;
export const orgEnableAdminCustomName = window.org ? window.org.pageOptions.orgEnableAdminCustomName === 'True' : false;
export const orgEnableAdminInviteUser = window.org ? window.org.pageOptions.orgEnableAdminInviteUser === 'True' : false;
export const orgEnableAdminDeleteOrg = window.org ? window.org.pageOptions.orgEnableAdminDeleteOrg === 'True' : false;
export const enableMultiADFS = window.org ? window.org.pageOptions.enableMultiADFS === 'True' : false;
export const enableSSO = window.org ? window.org.pageOptions.enableSSO === 'True' : false;
export const enableSubscription = window.org ? window.org.pageOptions.enableSubscription : false;
export const enableExternalBillingService = window.org ? window.org.pageOptions.enableExternalBillingService : false;

// sys admin
export const constanceEnabled = window.sysadmin ? window.sysadmin.pageOptions.constance_enabled : '';
export const multiTenancy = window.sysadmin ? window.sysadmin.pageOptions.multi_tenancy : '';
export const multiInstitution = window.sysadmin ? window.sysadmin.pageOptions.multi_institution : '';
export const sysadminExtraEnabled = window.sysadmin ? window.sysadmin.pageOptions.sysadmin_extra_enabled : '';
export const enableGuestInvitation = window.sysadmin ? window.sysadmin.pageOptions.enable_guest_invitation : '';
export const enableTermsAndConditions = window.sysadmin ? window.sysadmin.pageOptions.enable_terms_and_conditions : '';
export const isDefaultAdmin = window.sysadmin ? window.sysadmin.pageOptions.is_default_admin : '';
export const enableFileScan = window.sysadmin ? window.sysadmin.pageOptions.enable_file_scan : '';
export const canViewSystemInfo = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.can_view_system_info : '';
export const canViewStatistic = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.can_view_statistic : '';
export const canConfigSystem = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.can_config_system : '';
export const canManageLibrary = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.can_manage_library : '';
export const canManageUser = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.can_manage_user : '';
export const canManageGroup = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.can_manage_group : '';
export const canViewUserLog = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.can_view_user_log : '';
export const canViewAdminLog = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.can_view_admin_log : '';
export const otherPermission = window.sysadmin ? window.sysadmin.pageOptions.admin_permissions.other_permission : '';
export const enableWorkWeixin = window.sysadmin ? window.sysadmin.pageOptions.enable_work_weixin : '';
export const enableDingtalk = window.sysadmin ? window.sysadmin.pageOptions.enable_dingtalk : '';
export const enableSysAdminViewRepo = window.sysadmin ? window.sysadmin.pageOptions.enableSysAdminViewRepo : '';
export const haveLDAP = window.sysadmin ? window.sysadmin.pageOptions.haveLDAP : '';
export const enableShareLinkReportAbuse = window.sysadmin ? window.sysadmin.pageOptions.enable_share_link_report_abuse : '';

// institution admin
export const institutionName = window.app ? window.app.pageOptions.institutionName : '';

export const MimetypesKind = {
  opus: 'video/ogg',
  ogv: 'video/ogg',
  mp4: 'video/mp4',
  mov: 'video/mp4',
  m4v: 'video/mp4',
  mkv: 'video/x-matroska',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  aac: 'audio/aac',
  caf: 'audio/x-caf',
  flac: 'audio/flac',
  oga: 'audio/ogg',
  wav: 'audio/wav',
  m3u8: 'application/x-mpegURL',
  mpd: 'application/dash+xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp'
};

export const LARGE_DIALOG_STYLE = { maxWidth: '980px' };

export const SF_COLOR_MODE = 'sf_color_mode';

export const SF_DIRECTORY_TREE_SORT_BY_KEY = 'sf_directory_tree_sort_by';
export const SF_DIRECTORY_TREE_SORT_ORDER_KEY = 'sf_directory_tree_sort_order';

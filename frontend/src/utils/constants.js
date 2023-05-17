export const defaultContentForSDoc = {
  version: 0,
  children: [{id: 'aaaa', type: 'paragraph', children: [{ text: '' }]}]
};

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
export const isDocs = window.app.config.isDocs === 'True';
export const lang = window.app.config.lang;
export const fileServerRoot = window.app.config.fileServerRoot;
export const useGoFileserver = window.app.config.useGoFileserver;
export const seafileVersion = window.app.config.seafileVersion;
export const serviceURL = window.app.config.serviceURL;
export const appAvatarURL = window.app.config.avatarURL;
export const faviconPath = window.app.config.faviconPath;
export const loginBGPath = window.app.config.loginBGPath;
export const enableRepoAutoDel = window.app.config.enableRepoAutoDel;

//pageOptions
export const trashReposExpireDays = window.app.pageOptions.trashReposExpireDays;
export const dtableWebServer = window.app.pageOptions.dtableWebServer;
export const seafileCollabServer = window.app.pageOptions.seafileCollabServer;
export const name = window.app.pageOptions.name;
export const contactEmail = window.app.pageOptions.contactEmail;
export const username = window.app.pageOptions.username;
export const canAddRepo = window.app.pageOptions.canAddRepo;
export const canAddGroup = window.app.pageOptions.canAddGroup;
export const groupImportMembersExtraMsg = window.app.pageOptions.groupImportMembersExtraMsg;
export const canGenerateShareLink = window.app.pageOptions.canGenerateShareLink;
export const canGenerateUploadLink = window.app.pageOptions.canGenerateUploadLink;
export const canSendShareLinkEmail = window.app.pageOptions.canSendShareLinkEmail;
export const canViewOrg = window.app.pageOptions.canViewOrg === 'True';
export const fileAuditEnabled = window.app.pageOptions.fileAuditEnabled;
export const enableFileComment = window.app.pageOptions.enableFileComment ? true : false;
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
export const aboutDialogCustomHtml = window.app.pageOptions.aboutDialogCustomHtml;
export const shareLinkExpireDaysDefault = window.app.pageOptions.shareLinkExpireDaysDefault;
export const uploadLinkExpireDaysMin = window.app.pageOptions.uploadLinkExpireDaysMin;
export const uploadLinkExpireDaysMax = window.app.pageOptions.uploadLinkExpireDaysMax;
export const uploadLinkExpireDaysDefault = window.app.pageOptions.uploadLinkExpireDaysDefault;
export const enableShareToDepartment = window.app.pageOptions.enableShareToDepartment;
export const maxFileName = window.app.pageOptions.maxFileName;
export const canPublishRepo = window.app.pageOptions.canPublishRepo;
export const enableEncryptedLibrary = window.app.pageOptions.enableEncryptedLibrary;
export const enableRepoHistorySetting = window.app.pageOptions.enableRepoHistorySetting;
export const isSystemStaff = window.app.pageOptions.isSystemStaff;
export const thumbnailSizeForOriginal = window.app.pageOptions.thumbnailSizeForOriginal;
export const repoPasswordMinLength = window.app.pageOptions.repoPasswordMinLength;
export const canAddPublicRepo = window.app.pageOptions.canAddPublicRepo;
export const canInvitePeople = window.app.pageOptions.canInvitePeople;
export const canLockUnlockFile = window.app.pageOptions.canLockUnlockFile;
export const customNavItems = window.app.pageOptions.customNavItems;
export const enableShowContactEmailWhenSearchUser = window.app.pageOptions.enableShowContactEmailWhenSearchUser;
export const maxUploadFileSize = window.app.pageOptions.maxUploadFileSize;
export const maxNumberOfFilesForFileupload = window.app.pageOptions.maxNumberOfFilesForFileupload;
export const enableOCM = window.app.pageOptions.enableOCM;
export const ocmRemoteServers = window.app.pageOptions.ocmRemoteServers;
export const enableOCMViaWebdav = window.app.pageOptions.enableOCMViaWebdav;
export const enableSSOToThirdpartWebsite = window.app.pageOptions.enableSSOToThirdpartWebsite;
export const enableSeadoc = window.app.pageOptions.enableSeadoc;

export const curNoteMsg = window.app.pageOptions.curNoteMsg;
export const curNoteID = window.app.pageOptions.curNoteID;

export const enableTC = window.app.pageOptions.enableTC;

export const enableVideoThumbnail = window.app.pageOptions.enableVideoThumbnail;

export const enableOnlyoffice = window.app.pageOptions.enableOnlyoffice || false;
export const onlyofficeConverterExtensions = window.app.pageOptions.onlyofficeConverterExtensions || [];

// dtable
export const workspaceID = window.app.pageOptions.workspaceID;
export const showLogoutIcon = window.app.pageOptions.showLogoutIcon;
export const additionalShareDialogNote = window.app.pageOptions.additionalShareDialogNote;
export const additionalAppBottomLinks = window.app.pageOptions.additionalAppBottomLinks;
export const additionalAboutDialogLinks = window.app.pageOptions.additionalAboutDialogLinks;

// wiki
export const slug = window.wiki ? window.wiki.config.slug : '';
export const repoID = window.wiki ? window.wiki.config.repoId : '';
export const initialPath = window.wiki ? window.wiki.config.initial_path : '';
export const permission = window.wiki ? window.wiki.config.permission === 'True' : '';
export const isDir = window.wiki ? window.wiki.config.isDir : '';
export const serviceUrl = window.wiki ? window.wiki.config.serviceUrl : '';
export const isPublicWiki = window.wiki ? window.wiki.config.isPublicWiki === 'True': '';
export const sharedToken = window.wiki ? window.wiki.config.sharedToken : '';
export const sharedType = window.wiki ? window.wiki.config.sharedType : '';
export const hasIndex = window.wiki ? window.wiki.config.hasIndex : '';

// file history
export const PER_PAGE = 25;
export const historyRepoID = window.fileHistory ? window.fileHistory.pageOptions.repoID : '';
export const repoName = window.fileHistory ? window.fileHistory.pageOptions.repoName : '';
export const filePath = window.fileHistory ? window.fileHistory.pageOptions.filePath : '';
export const fileName = window.fileHistory ? window.fileHistory.pageOptions.fileName : '';
export const useNewAPI = window.fileHistory ? window.fileHistory.pageOptions.use_new_api : '';
export const canDownload = window.fileHistory ? window.fileHistory.pageOptions.can_download_file : '';
export const canCompare = window.fileHistory ? window.fileHistory.pageOptions.can_compare : '';

// Draft review
export const draftFilePath = window.draft ? window.draft.config.draftFilePath: '';
export const draftOriginFilePath = window.draft ? window.draft.config.draftOriginFilePath: '';
export const draftFileName = window.draft ? window.draft.config.draftFileName: '';
export const draftID = window.draft ? window.draft.config.draftID : '';
export const draftRepoID = window.draft ? window.draft.config.draftRepoID : '';
export const author = window.draft ? window.draft.config.author : '';
export const authorAvatar = window.draft ? window.draft.config.authorAvatar : '';
export const originFileExists = window.draft ? window.draft.config.originFileExists : '';
export const draftFileExists = window.draft ? window.draft.config.draftFileExists : '';
export const draftStatus = window.draft ? window.draft.config.draftStatus : '';
export const draftPublishVersion = window.draft ? window.draft.config.draftPublishVersion : '';
export const originFileVersion = window.draft ? window.draft.config.originFileVersion : '';
export const filePermission = window.draft ? window.draft.config.perm : '';

// org admin
export const orgID = window.org ? window.org.pageOptions.orgID : '';
export const orgName = window.org ? window.org.pageOptions.orgName : '';
export const invitationLink = window.org ? window.org.pageOptions.invitationLink : '';
export const orgMemberQuotaEnabled = window.org ? window.org.pageOptions.orgMemberQuotaEnabled : '';
export const orgEnableAdminCustomLogo = window.org ? window.org.pageOptions.orgEnableAdminCustomLogo === 'True' : false;
export const orgEnableAdminCustomName = window.org ? window.org.pageOptions.orgEnableAdminCustomName === 'True' : false;
export const enableMultiADFS = window.org ? window.org.pageOptions.enableMultiADFS === 'True' : false;

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

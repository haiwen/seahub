const paths = require('./paths');

const entryFiles = {
  markdownEditor: "/index.js",
  TCAccept: "/tc-accept.js",
  TCView: "/tc-view.js",
  userNotifications: "/user-notifications.js",
  wiki: "/wiki.js",
  fileHistory: "/file-history.js",
  fileHistoryOld: "/file-history-old.js",
  sdocFileHistory: "/pages/sdoc-file-history/index.js",
  app: "/app.js",
  draft: "/draft.js",
  sharedDirView: "/shared-dir-view.js",
  sharedFileViewMarkdown: "/shared-file-view-markdown.js",
  sharedFileViewText: "/shared-file-view-text.js",
  sharedFileViewImage: "/shared-file-view-image.js",
  sharedFileViewVideo: "/shared-file-view-video.js",
  sharedFileViewPDF: "/shared-file-view-pdf.js",
  sharedFileViewSVG: "/shared-file-view-svg.js",
  sharedFileViewAudio:  "/shared-file-view-audio.js",
  sharedFileViewDocument: "/shared-file-view-document.js",
  sharedFileViewSpreadsheet: "/shared-file-view-spreadsheet.js",
  sharedFileViewSdoc: "/shared-file-view-sdoc.js",
  sharedFileViewUnknown: "/shared-file-view-unknown.js",
  historyTrashFileView: "/history-trash-file-view.js",
  fileView: "/file-view.js",
  viewFileText: "/view-file-text.js",
  viewFileSdoc: "/view-file-sdoc.js",
  viewFileDocument: "/view-file-document.js",
  viewFileSpreadsheet: "/view-file-spreadsheet.js",
  settings: "/settings.js",
  repoHistory: "/repo-history.js",
  repoSnapshot: "/repo-snapshot.js",
  repoFolderTrash: "/repo-folder-trash.js",
  orgAdmin: "/pages/org-admin",
  sysAdmin: "/pages/sys-admin",
  search: "/pages/search",
  uploadLink: "/pages/upload-link",
};

const getEntries = (isEnvDevelopment) => {
  let entries = {};
  Object.keys(entryFiles).forEach(key => {
    let entry = [];
    entry.push(require.resolve('./polyfills'));
    if (isEnvDevelopment) {
      entry.push(require.resolve('react-dev-utils/webpackHotDevClient'));
    }
    entry.push(paths.appSrc + entryFiles[key]);

    entries[key] = entry;
  });
  return entries;
};

module.exports = getEntries;

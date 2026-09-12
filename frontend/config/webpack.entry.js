const paths = require('./paths');

const entryFiles = {
  app: '/app.js',
  excalidrawEditor: '/excalidraw-editor.js',
  fileHistory: '/file-history.js',
  fileHistoryOld: '/file-history-old.js',
  fileView: '/file-view.js',
  historyTrashFileView: '/history-trash-file-view.js',
  institutionAdmin: '/institution-admin.js',
  markdownEditor: '/markdown-editor.js',
  orgAdmin: '/org-admin.js',
  plainMarkdownEditor: '/plain-markdown-editor.js',
  repoFolderTrash: '/repo-folder-trash.js',
  repoHistory: '/repo-history.js',
  repoSnapshot: '/repo-snapshot.js',
  sdocFileHistory: '/sdoc-file-history.js',
  sdocPublishedRevision: '/sdoc-published-revision.js',
  sdocRevision: '/sdoc-revision.js',
  sdocThumbnail: '/sdoc-thumbnail.js',
  settings: '/settings.js',
  sharedDirView: '/shared-dir-view.js',
  sharedFileViewAudio: '/shared-file-view-audio.js',
  sharedFileViewDocument: '/shared-file-view-document.js',
  sharedFileViewExdraw: '/shared-file-view-exdraw.js',
  sharedFileViewImage: '/shared-file-view-image.js',
  sharedFileViewMarkdown: '/shared-file-view-markdown.js',
  sharedFileViewPDF: '/shared-file-view-pdf.js',
  sharedFileViewSdoc: '/shared-file-view-sdoc.js',
  sharedFileViewSpreadsheet: '/shared-file-view-spreadsheet.js',
  sharedFileViewSVG: '/shared-file-view-svg.js',
  sharedFileViewText: '/shared-file-view-text.js',
  sharedFileViewUnknown: '/shared-file-view-unknown.js',
  sharedFileViewVideo: '/shared-file-view-video.js',
  subscription: '/subscription.js',
  sysAdmin: '/sys-admin.js',
  sysadminRepoHistory: '/pages/sys-admin/repo-history/index.js',
  sysadminRepoSnapshot: '/pages/sys-admin/repo-snapshot/index.js',
  TCAccept: '/tc-accept.js',
  TCView: '/tc-view.js',
  uploadLink: '/upload-link.js',
  viewFileCollaboraOnline: '/view-file-collabora-online.js',
  viewFileDocument: '/view-file-document.js',
  viewFileOnlyoffice: '/view-file-onlyoffice.js',
  viewFileSdoc: '/view-file-sdoc.js',
  viewFileSpreadsheet: '/view-file-spreadsheet.js',
  viewFileText: '/view-file-text.js',
  wiki: '/wiki.js',
  wiki2: '/wiki2.js',
  wikiViewer: '/pages/wiki-viewer/index.js',
};

const getEntries = (isEnvDevelopment) => {
  let entries = {};
  Object.keys(entryFiles).forEach(key => {
    let entry = [];
    if (isEnvDevelopment) {
      entry.push(require.resolve('react-dev-utils/webpackHotDevClient'));
    }
    entry.push(paths.appSrc + entryFiles[key]);

    entries[key] = entry;
  });
  return entries;
};

module.exports = getEntries;

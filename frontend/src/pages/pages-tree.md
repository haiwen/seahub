# 目录说明

未来阅读代码和理解功能，需要对主要目录和功能进行说明，并辅助代码注释。

## 概述

seahub 前端是一个多入口，多页面的项目。也就是说，多个 URL 对应多个页面，每个页面通常对应 pages 目录下的一个子目录，如用户管理、文件管理、群组管理、机构管理、资料库管理、markdown 编辑器页面，sdoc 编辑器页面等。

具体多页面的入口见 webpack 入口配置文件，其中一部分入口在 page 路径下，一部分入口在 src 根目录中。

```js
const entryFiles = {

    // 主入口
    app: '/app.js',

    // 共享相关
    sharedDirView: '/shared-dir-view.js',
    sharedFileViewMarkdown: '/shared-file-view-markdown.js',
    sharedFileViewText: '/shared-file-view-text.js',
    sharedFileViewImage: '/shared-file-view-image.js',
    sharedFileViewVideo: '/shared-file-view-video.js',
    sharedFileViewPDF: '/shared-file-view-pdf.js',
    sharedFileViewSVG: '/shared-file-view-svg.js',
    sharedFileViewAudio: '/shared-file-view-audio.js',
    sharedFileViewDocument: '/shared-file-view-document.js',
    sharedFileViewSpreadsheet: '/shared-file-view-spreadsheet.js',
    sharedFileViewSdoc: '/shared-file-view-sdoc.js',
    sharedFileViewUnknown: '/shared-file-view-unknown.js',

    // 文件相关
    fileView: '/file-view.js',
    viewFileText: '/view-file-text.js',
    viewFileSdoc: '/view-file-sdoc.js',
    viewFileDocument: '/view-file-document.js',
    viewFileSpreadsheet: '/view-file-spreadsheet.js',
    viewFileOnlyoffice: '/view-file-onlyoffice.js',
    viewFileCollaboraOnline: '/view-file-collabora-online.js',

    // 编辑器相关
    tldrawEditor: '/tldrawEditor.js',
    markdownEditor: '/index.js',
    plainMarkdownEditor: '/pages/plain-markdown-editor/index.js',
    sdocFileHistory: '/pages/sdoc/sdoc-file-history/index.js',
    sdocPublishedRevision: '/pages/sdoc/sdoc-published-revision/index.js',

    // 后台管理（设置，系统管理，组织管理 org，订阅管理，机构管理 institution）
    settings: '/settings.js',
    orgAdmin: '/pages/org-admin',
    sysAdmin: '/pages/sys-admin',
    subscription: '/subscription.js',
    institutionAdmin: '/pages/institution-admin/index.js'

    // 其他部分
    historyTrashFileView: '/history-trash-file-view.js',
    uploadLink: '/pages/upload-link',
    repoHistory: '/repo-history.js',
    repoSnapshot: '/repo-snapshot.js',
    repoFolderTrash: '/repo-folder-trash.js',
    draft: '/draft.js',
    TCAccept: '/tc-accept.js',
    TCView: '/tc-view.js',
    wiki: '/wiki.js',
    wiki2: '/wiki2.js',
    fileHistory: '/file-history.js',
    fileHistoryOld: '/file-history-old.js',
};
```

## page 目录


## 01 画板编辑器（苏国栋 2024）

https://github.com/haiwen/seahub/pull/7273

├── tldraw-editor
│   ├── editor-api.js API 处理文件下载和上传
│   └── index.js 画板编辑器的套壳，处理快捷键，保存内容等

## 02 markdown 普通字符编辑器（刘宏博 2024 重构）

https://github.com/haiwen/seahub/pull/5998

├── plain-markdown-editor
│   ├── code-mirror.js codemirror 代码阅读器定制后效果
│   ├── helper.js API 获取文件信息封装后的函数
│   ├── index.js 普通文本编辑器入口，左侧是格式化编辑代码，右侧显示预览

## markdown 03 富文本编辑器

├── markdown-editor
│   ├── detail-list-view：右侧栏（文件编辑标签和文件元信息）
│   ├── editor-api.js：文本编辑器常用的 API 封装
│   ├── header-toolbar
│   │   ├── button-group.js 封装的按钮组
│   │   ├── button-item.js 封装的按钮
│   │   ├── collab-users-button.js 废弃组件
│   │   ├── file-info.js 文件左上角基本信息（名称，星标，内部链接）
│   │   ├── header-toolbar.js 文件表头的工具栏（富文本和普通文本共同使用）
│   │   └── more-menu.js 更多按钮，便于切换模式
│   └── index.js markdown 富文本编辑器的外壳（实际有很多废弃代码，例如多人协同，协作人等变量）

—————————————————————————————————————————————————没有查看—————————————————————————————————————————————————

## sdoc 编辑器

├── sdoc
│   ├── sdoc-editor
│   │   ├── external-operations.js
│   │   ├── index.css
│   │   └── index.js
│   ├── sdoc-file-history
│   │   ├── helper.js
│   │   ├── history-version.js
│   │   ├── index.css
│   │   ├── index.js
│   │   └── side-panel.js
│   └── sdoc-published-revision
│       └── index.js

## sdoc 历史版本

├── sdoc-revision
│   └── index.js



## 维基列表

└── wikis
    └── wikis.js

## 旧版维基

├── wiki
│   ├── index-md-viewer
│   │   ├── index.js
│   │   ├── nav-item.js
│   │   └── style.css
│   ├── index.js
│   ├── main-panel.js
│   ├── side-panel.js
│   ├── utils
│   │   └── generate-navs.js
│   └── wiki.css

## 新版维基

├── wiki2
│   ├── common
│   │   ├── delete-dialog.js
│   │   ├── name-edit-popover.js
│   │   └── nav-item-icon.js
│   ├── constant.js
│   ├── css
│   │   ├── add-new-page-dialog.css
│   │   ├── name-edit-popover.css
│   │   ├── nav-item-icon.css
│   │   └── wiki-nav.css
│   ├── custom-icon.js
│   ├── index.js
│   ├── main-panel.js
│   ├── models
│   │   ├── page.js
│   │   └── wiki-config.js
│   ├── side-panel.css
│   ├── side-panel.js
│   ├── top-nav
│   │   ├── index.css
│   │   └── index.js
│   ├── utils
│   │   ├── emoji-utils.js
│   │   ├── generate-navs.js
│   │   └── index.js
│   ├── wiki-external-operations.js
│   ├── wiki-nav
│   │   ├── add-new-page-dialog.js
│   │   ├── constants.js
│   │   ├── html5DragDropContext.js
│   │   ├── index.js
│   │   ├── page-utils.js
│   │   ├── pages
│   │   │   ├── dragged-page-item.js
│   │   │   ├── page-dropdownmenu.js
│   │   │   └── page-item.js
│   │   └── wiki-nav.js
│   ├── wiki-right-header
│   │   ├── index.js
│   │   ├── page-cover.css
│   │   ├── page-cover.js
│   │   ├── page-icon.js
│   │   ├── page-title-editor.js
│   │   ├── page-title.css
│   │   └── page-title.js
│   ├── wiki-trash-dialog.js
│   └── wiki.css


## org-admin 机构管理

├── org-admin
│   ├── departments
│   │   ├── department-node.js
│   │   ├── department.js
│   │   ├── departments-node-dropdown-menu.js
│   │   ├── departments-tree-panel.js
│   │   ├── departments.js
│   │   ├── member-item.js
│   │   ├── repo-item.js
│   │   └── tree-node.js
│   ├── devices
│   │   ├── desktop-devices.js
│   │   ├── devices-by-platform.js
│   │   ├── devices-errors.js
│   │   ├── devices-nav.js
│   │   └── mobile-devices.js
│   ├── index.js
│   ├── input-item.js
│   ├── libraries
│   │   ├── org-all-repos.js
│   │   ├── org-repo-nav.js
│   │   └── org-repo-trash.js
│   ├── main-panel-topbar.js
│   ├── org-admin-list.js
│   ├── org-group-info.js
│   ├── org-group-members.js
│   ├── org-group-repos.js
│   ├── org-groups-search-groups.js
│   ├── org-groups.js
│   ├── org-info.js
│   ├── org-links.js
│   ├── org-logs-file-audit.js
│   ├── org-logs-file-transfer.js
│   ├── org-logs-file-update.js
│   ├── org-logs-perm-audit.js
│   ├── org-logs.js
│   ├── org-saml-config.js
│   ├── org-subscription.js
│   ├── org-user-item.js
│   ├── org-user-profile.js
│   ├── org-user-repos.js
│   ├── org-user-shared-repos.js
│   ├── org-users-admins.js
│   ├── org-users-list.js
│   ├── org-users-nav.js
│   ├── org-users-search-users.js
│   ├── org-users-users.js
│   ├── section.js
│   ├── side-panel.js
│   ├── statistic
│   │   ├── picker.js
│   │   ├── statistic-chart.js
│   │   ├── statistic-common-tool.js
│   │   ├── statistic-file.js
│   │   ├── statistic-nav.js
│   │   ├── statistic-reports.js
│   │   ├── statistic-storage.js
│   │   ├── statistic-traffic-users.js
│   │   ├── statistic-traffic.js
│   │   ├── statistic-users.js
│   │   ├── traffic-table-body.js
│   │   └── traffic-table.js
│   ├── user-link.js
│   └── web-settings
│       ├── checkbox-item.js
│       ├── file-item.js
│       ├── input-item.js
│       ├── section.js
│       ├── setting-item-base.js
│       └── web-settings.js


## institution-admin 机构管理

├── institution-admin
│   ├── api
│   │   └── index.js： 存放机构管理相关的 API 接口。
│   ├── index.js
│   ├── main-panel.js
│   ├── side-panel.js
│   ├── user-content
│   │   ├── index.js
│   │   ├── user-group-item.js
│   │   ├── user-groups.js
│   │   ├── user-info.js
│   │   ├── user-repo-item.js
│   │   └── user-repos.js
│   ├── user-list
│   │   ├── index.js
│   │   └── user-item.js
│   ├── user-list-search
│   │   └── index.js
│   ├── users-nav
│   │   └── index.js
│   └── utils
│       └── index.js

## sys-admin 系统管理

├── sys-admin
│   ├── abuse-reports.js
│   ├── admin-logs
│   │   ├── login-logs.js
│   │   ├── logs-nav.js
│   │   └── operation-logs.js
│   ├── departments
│   │   ├── department-node.js
│   │   ├── department.js
│   │   ├── departments-node-dropdown-menu.js
│   │   ├── departments-tree-panel.js
│   │   ├── departments.js
│   │   ├── member-item.js
│   │   ├── repo-item.js
│   │   └── tree-node.js
│   ├── devices
│   │   ├── desktop-devices.js
│   │   ├── devices-by-platform.js
│   │   ├── devices-errors.js
│   │   ├── devices-nav.js
│   │   └── mobile-devices.js
│   ├── dingtalk
│   │   ├── dingtalk-department-members-list.js
│   │   ├── dingtalk-departments-tree-node.js
│   │   ├── dingtalk-departments-tree-panel.js
│   │   └── index.js
│   ├── dingtalk-departments.js
│   ├── file-scan-records.js
│   ├── groups
│   │   ├── group-members.js
│   │   ├── group-nav.js
│   │   ├── group-repos.js
│   │   ├── groups-content.js
│   │   ├── groups.js
│   │   └── search-groups.js
│   ├── index.js
│   ├── info.js
│   ├── institutions
│   │   ├── institution-admins.js
│   │   ├── institution-info.js
│   │   ├── institution-nav.js
│   │   ├── institution-users.js
│   │   └── institutions.js
│   ├── invitations
│   │   └── invitations.js
│   ├── links
│   │   ├── links-nav.js
│   │   ├── share-links.js
│   │   └── upload-links.js
│   ├── logs-page
│   │   ├── file-access-item-menu.js
│   │   ├── file-access-logs.js
│   │   ├── file-access-toggle-filter.js
│   │   ├── file-transfer-log.js
│   │   ├── file-update-logs.js
│   │   ├── login-logs.js
│   │   ├── logs-nav.js
│   │   └── share-permission-logs.js
│   ├── main-panel-topbar.js
│   ├── main-panel.js
│   ├── notifications
│   │   └── notifications.js
│   ├── orgs
│   │   ├── org-groups.js
│   │   ├── org-info.js
│   │   ├── org-nav.js
│   │   ├── org-repos.js
│   │   ├── org-users.js
│   │   ├── orgs-content.js
│   │   ├── orgs.js
│   │   └── search-orgs.js
│   ├── repos
│   │   ├── all-repos.js
│   │   ├── all-wikis.js
│   │   ├── dir-content.js
│   │   ├── dir-path-bar.js
│   │   ├── dir-view.js
│   │   ├── repos-nav.js
│   │   ├── repos.js
│   │   ├── search-repos.js
│   │   ├── system-repo.js
│   │   └── trash-repos.js
│   ├── search.js
│   ├── side-panel.js
│   ├── statistic
│   │   ├── picker.js
│   │   ├── statistic-chart.js
│   │   ├── statistic-common-tool.js
│   │   ├── statistic-file.js
│   │   ├── statistic-nav.js
│   │   ├── statistic-reports.js
│   │   ├── statistic-storage.js
│   │   ├── statistic-traffic-orgs.js
│   │   ├── statistic-traffic-users.js
│   │   ├── statistic-traffic.js
│   │   ├── statistic-users.js
│   │   ├── traffic-table-body.js
│   │   └── traffic-table.js
│   ├── terms-and-conditions
│   │   ├── content.js
│   │   ├── item.js
│   │   └── terms-and-conditions.js
│   ├── user-link.js
│   ├── users
│   │   ├── admin-users.js
│   │   ├── ldap-imported-users.js
│   │   ├── ldap-users.js
│   │   ├── search-users.js
│   │   ├── user-groups.js
│   │   ├── user-info.js
│   │   ├── user-links.js
│   │   ├── user-nav.js
│   │   ├── user-repos.js
│   │   ├── user-shared-repos.js
│   │   ├── users-content.js
│   │   ├── users-filter-bar.css
│   │   ├── users-filter-bar.js
│   │   ├── users-nav.js
│   │   └── users.js
│   ├── virus-scan
│   │   ├── all-virus-files.js
│   │   ├── nav.js
│   │   └── unhandled-virus-files.js
│   ├── web-settings
│   │   ├── checkbox-item.js
│   │   ├── file-item.js
│   │   ├── input-item.js
│   │   ├── section.js
│   │   ├── setting-item-base.js
│   │   └── web-settings.js
│   ├── work-weixin
│   │   ├── index.js
│   │   ├── work-weixin-department-members-list.js
│   │   ├── work-weixin-departments-tree-node.js
│   │   └── work-weixin-departments-tree-panel.js
│   └── work-weixin-departments.js

### 其他

├── dashboard
│   ├── activity-item.js： 活动项的组件，用于展示用户的活动记录。
│   ├── content.js： 内容组件，用于展示用户的文件和文件夹列表。
│   ├── files-activities.js： 一个文件活动组件，用于展示文件的活动记录。
│   ├── my-file-activities.js： 我的文件活动组件，用于展示用户自己的文件活动记录。
│   └── user-selector.js： 用户选择器组件，用于选择用户。


├── file-history
│   ├── main-panel.js：文件历史的主面板组件，用于展示文件的历史版本。
│   └── side-panel.js：文件历史的侧边栏组件，用于展示文件的历史版本列表。


├── file-history-old
│   └── history-item.js： 历史项组件，用于展示文件的历史版本。


├── groups
│   ├── group-item.js： 群组项组件，用于展示群组信息。
│   └── group-view.js： 群组视图组件，用于展示群组列表。


├── invitations
│   └── invitations-view.js


├── lib-content-view
│   └── lib-content-view.js


├── libraries
│   ├── groups-repos-manager.js
│   └── index.js


├── linked-devices
│   └── linked-devices.js


├── my-libs
│   ├── my-libs-deleted.js
│   ├── my-libs.js
│   ├── mylib-repo-list-item.js
│   ├── mylib-repo-list-view.js
│   └── mylib-repo-menu.js


├── ocm-via-webdav
│   └── ocm-via-webdav.js


├── repo-wiki-mode
│   └── side-panel.js


├── share-admin
│   ├── folders.js
│   ├── libraries.js
│   ├── share-links.js
│   └── upload-links.js


├── share-with-ocm
│   ├── remote-dir-content.js
│   ├── remote-dir-path.js
│   ├── remote-dir-view.js
│   └── shared-with-ocm.js


├── shared-libs
│   ├── content.js
│   ├── index.js
│   └── item.js


├── shared-with-all
│   └── index.js


├── starred
│   └── starred.js


├── upload-link
│   ├── file-uploader.js
│   ├── forbid-upload-list-item.js
│   ├── index.js
│   ├── upload-list-item.js
│   └── upload-progress-dialog.js


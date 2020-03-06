/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'js.cookie',
    'app/views/side-nav',
    'app/views/myhome-repos',
    'app/views/my-deleted-repos',
    'app/views/myhome-shared-repos',
    'app/views/groups',
    'app/views/group',
    'app/views/organization',
    'app/views/dir',
    'app/views/starred-file',
    'app/views/activities',
    'app/views/devices',
    'app/views/invitations',
    'app/views/share-admin-repos',
    'app/views/share-admin-folders',
    'app/views/share-admin-share-links',
    'app/views/share-admin-upload-links',
    'app/views/notifications',
    'app/views/account'
], function($, Backbone, Common, Cookies, SideNavView, MyReposView,
    MyDeletedReposView, SharedReposView, GroupsView, GroupView, OrgView,
    DirView, StarredFileView, ActivitiesView, DevicesView, InvitationsView,
    ShareAdminReposView, ShareAdminFoldersView, ShareAdminShareLinksView,
    ShareAdminUploadLinksView, NotificationsView, AccountView) {
    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            '': 'showRepos',
            'my-libs/': 'showMyRepos',
            'my-libs/deleted/': 'showMyDeletedRepos',
            'my-libs/lib/:repo_id(/*path)': 'showMyRepoDir',
            'shared-libs/': 'showSharedRepos',
            'shared-libs/lib/:repo_id(/*path)': 'showSharedRepoDir',
            'groups/': 'showGroups',
            'group/:group_id/': 'showGroup',
            'group/:group_id/lib/:repo_id(/*path)': 'showGroupRepoDir',
            'group/:group_id/discussions/': 'showGroupDiscussions',
            'org/': 'showOrgRepos',
            'org/lib/:repo_id(/*path)': 'showOrgRepoDir',
            'common/lib/:repo_id(/*path)': 'showCommonDir',
            'starred/': 'showStarredFile',
            'activities/': 'showActivities',
            'devices/': 'showDevices',
            'invitations/': 'showInvitations',
            'share-admin-libs/': 'showShareAdminRepos',
            'share-admin-folders/': 'showShareAdminFolders',
            'share-admin-share-links/': 'showShareAdminShareLinks',
            'share-admin-upload-links/': 'showShareAdminUploadLinks',
            // Default
            '*actions': 'showRepos'
        },

        initialize: function() {
            $('.initial-loading').hide();
            $('.main-content').removeClass('hide');

            Common.prepareApiCsrf();
            Common.initLocale();

            this.sideNavView = new SideNavView();
            app.ui.sideNavView = this.sideNavView;

            this.dirView = new DirView();

            this.myReposView = new MyReposView();
            this.myDeletedReposView = new MyDeletedReposView();
            this.sharedReposView = new SharedReposView();
            this.orgView = new OrgView();
            this.groupView = new GroupView();
            this.groupsView = new GroupsView();
            this.starredFileView = new StarredFileView();
            this.devicesView = new DevicesView();
            this.invitationsView = new InvitationsView();
            this.activitiesView = new ActivitiesView();
            this.shareAdminReposView = new ShareAdminReposView();
            this.shareAdminFoldersView = new ShareAdminFoldersView();
            this.shareAdminShareLinksView = new ShareAdminShareLinksView();
            this.shareAdminUploadLinksView = new ShareAdminUploadLinksView();

            app.ui.notificationsView = this.notificationsView = new NotificationsView();
            app.ui.accountView = this.accountView = new AccountView();
            app.pageOptions.sort_mode = Cookies.get('sort_mode') || 'name_up';

            var _this = this;
            var originalWindowWidth = $(window).width();
            $(window).on('resize', function() {
                var curWidth = $(window).width();
                if (_this.currentView.reset) {
                    if ((originalWindowWidth < 768 && curWidth >= 768 ) ||
                        (originalWindowWidth >= 768 && curWidth < 768)) {
                        _this.currentView.reset();
                    }
                }
                originalWindowWidth = curWidth;
            });

            // for popups such as '#share-popup'
            $(window).on('resize', function() {
                var $el = $('#share-popup, #repo-share-link-admin-dialog, #repo-folder-perm-popup, #folder-perm-popup');
                if ($el.is(':visible')) {
                    if ($(window).width() < 768) {
                        $el.css({
                            'width': $(window).width() - 50,
                            'height': $(window).height() - 50,
                            'overflow': 'auto'
                        });
                        $.modal.update($(window).height() - 50, $(window).width() - 50);
                    } else {
                        $el.removeAttr('style');
                        $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
                    }
                }
            });


            $('#info-bar .close').on('click', Common.closeTopNoticeBar);
            $('#top-browser-tip-close').on('click', function () {
                $('#top-browser-tip').addClass('hide');
            });
        },

        switchCurrentView: function(newView) {
            if (!this.currentView) {
                this.currentView = newView;
            } else {
                if (this.currentView != newView) {
                    if (this.currentView == this.dirView) {
                        if ($('#upload-file-dialog').is(':visible') &&
                            $('#upload-file-dialog .status').text() == window.fileuploading) {
                            if (!window.confirm(gettext('A file is being uploaded. Are you sure you want to leave this page?'))) {
                                return false;
                            }
                        }
                    }
                    this.currentView.hide();
                    this.currentView = newView;
                }
            }
            return true;
        },

        showRepos: function() {
            if (app.pageOptions.can_add_repo) {
                this.showMyRepos();
            } else {
                this.showSharedRepos();
            }
        },

        showMyRepos: function() {
            if (!this.switchCurrentView(this.myReposView)) {
                return false;
            };
            this.myReposView.show();
            this.sideNavView.setCurTab('mine');
        },

        showMyDeletedRepos: function() {
            if (!this.switchCurrentView(this.myDeletedReposView)) {
                return false;
            };
            this.myDeletedReposView.show();
            this.sideNavView.setCurTab('mine');
        },

        showSharedRepos: function() {
            if (!this.switchCurrentView(this.sharedReposView)) {
                return false;
            }
            this.sharedReposView.show();
            this.sideNavView.setCurTab('shared');
        },

        showMyRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.dirView);
            this.dirView.showDir('my-libs', repo_id, path);
            this.sideNavView.setCurTab('mine');
        },

        showCommonDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.dirView);
            this.dirView.showDir('common', repo_id, path);
            this.sideNavView.setCurTab('mine');
        },

        showSharedRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.dirView);
            this.dirView.showDir('shared-libs', repo_id, path);
            this.sideNavView.setCurTab('shared');
        },

        showGroups: function () {
            if (!this.switchCurrentView(this.groupsView)) {
                return false;
            }
            this.groupsView.show();
            this.sideNavView.setCurTab('group', {
                'cur_group_tab': 'groups',
                'cur_group_id': ''
            });
        },

        showGroup: function(group_id, options) {
            if (!this.switchCurrentView(this.groupView)) {
                return false;
            }
            this.groupView.show(group_id, options);
            this.sideNavView.setCurTab('group', {
                'cur_group_tab': '',
                'cur_group_id': group_id
            });
        },

        showGroupRepoDir: function(group_id, repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            var group_name = Common.groupId2Name(group_id);
            if (group_name) {
                this.switchCurrentView(this.dirView);
                this.dirView.showDir('group/' + group_id, repo_id, path, {
                        'group_id': group_id,
                        'group_name': group_name
                    });
                this.sideNavView.setCurTab('group', {
                    'cur_group_tab': '',
                    'cur_group_id': group_id
                });
            } else {
                // the group does not exist
                Common.feedback('Group {group_id} not found'.replace('{group_id}', group_id), 'error');
                app.router.navigate('', {trigger: true});
            }
        },

        showGroupDiscussions: function(group_id) {
            if (app.pageOptions.enable_group_discussion) {
                this.showGroup(group_id, {showDiscussions: true});
            } else {
                this.showGroup(group_id);
                app.router.navigate('group/' + group_id + '/');
            }
        },

        showOrgRepos: function() {
            if (!this.switchCurrentView(this.orgView)) {
                return false;
            }
            this.orgView.show();
            this.sideNavView.setCurTab('org');
        },

        showOrgRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.dirView);
            this.dirView.showDir('org', repo_id, path);
            this.sideNavView.setCurTab('org');
        },

        showStarredFile: function() {
            if (!this.switchCurrentView(this.starredFileView)) {
                return false;
            }
            this.starredFileView.show();
            this.sideNavView.setCurTab('starred');
        },

        showActivities: function() {
            if (!this.switchCurrentView(this.activitiesView)) {
                return false;
            }
            this.activitiesView.show();
            this.sideNavView.setCurTab('activities');
        },

        showDevices: function() {
            if (!this.switchCurrentView(this.devicesView)) {
                return false;
            }
            this.devicesView.show();
            this.sideNavView.setCurTab('devices');
        },

        showInvitations: function() {
            if (!this.switchCurrentView(this.invitationsView)) {
                return false;
            }
            this.invitationsView.show();
            this.sideNavView.setCurTab('invitations');
        },

        showShareAdminRepos: function() {
            if (!this.switchCurrentView(this.shareAdminReposView)) {
                return false;
            }
            this.shareAdminReposView.show();
            this.sideNavView.setCurTab('share-admin-repos', {'show_share_admin': true});
        },

        showShareAdminFolders: function() {
            if (!this.switchCurrentView(this.shareAdminFoldersView)) {
                return false;
            }
            this.shareAdminFoldersView.show();
            this.sideNavView.setCurTab('share-admin-folders', {'show_share_admin': true});
        },

        showShareAdminShareLinks: function() {
            if (!this.switchCurrentView(this.shareAdminShareLinksView)) {
                return false;
            }
            this.shareAdminShareLinksView.show();
            this.sideNavView.setCurTab('share-admin-links', {'show_share_admin': true});
        },

        showShareAdminUploadLinks: function() {
            if (!this.switchCurrentView(this.shareAdminUploadLinksView)) {
                return false;
            }
            this.shareAdminUploadLinksView.show();
            this.sideNavView.setCurTab('share-admin-links', {'show_share_admin': true});
        }

    });

    return Router;
});

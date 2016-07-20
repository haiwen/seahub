/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'app/views/side-nav',
    'app/views/myhome-repos',
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
], function($, Backbone, Common, SideNavView, MyReposView,
    SharedReposView, GroupsView, GroupView, OrgView, DirView,
    StarredFileView, ActivitiesView, DevicesView, InvitationsView,
    ShareAdminReposView, ShareAdminFoldersView, ShareAdminShareLinksView,
    ShareAdminUploadLinksView, NotificationsView, AccountView) {
    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            '': 'showRepos',
            'my-libs/': 'showMyRepos',
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
            $('.main-content').show();

            Common.prepareApiCsrf();
            Common.initLocale();

            this.sideNavView = new SideNavView();
            app.ui.sideNavView = this.sideNavView;

            this.dirView = new DirView();

            this.myReposView = new MyReposView();
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

            this.currentView = this.myReposView;

            $('#info-bar .close').click(Common.closeTopNoticeBar);
            $('#top-browser-tip .close').click(function () {
                $('#top-browser-tip').addClass('hide');
            });
        },

        switchCurrentView: function(newView) {
            if (this.currentView != newView) {
                this.currentView.hide();
                this.currentView = newView;
            }
            if (app.ui.groupDiscussions) {
                app.ui.groupDiscussions.hide();
            }
        },

        showRepos: function() {
            if (app.pageOptions.can_add_repo) {
                this.showMyRepos();
            } else {
                this.showSharedRepos();
            }
        },

        showMyRepos: function() {
            this.switchCurrentView(this.myReposView);
            this.myReposView.show();
            this.sideNavView.setCurTab('mine');
        },

        showSharedRepos: function() {
            this.switchCurrentView(this.sharedReposView);
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
            this.switchCurrentView(this.groupsView);
            this.groupsView.show();
            this.sideNavView.setCurTab('group', {
                'cur_group_tab': 'groups',
                'cur_group_id': ''
            });
        },

        showGroup: function(group_id, options) {
            this.switchCurrentView(this.groupView);
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
                this.dirView.showDir('group/' + group_id, repo_id, path,
                    {'group_name': group_name});
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
            this.showGroup(group_id, {showDiscussions: true});
        },

        showOrgRepos: function() {
            this.switchCurrentView(this.orgView);
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
            this.switchCurrentView(this.starredFileView);
            this.starredFileView.show();
            this.sideNavView.setCurTab('starred');
        },

        showActivities: function() {
            this.switchCurrentView(this.activitiesView);
            this.activitiesView.show();
            this.sideNavView.setCurTab('activities');
        },

        showDevices: function() {
            this.switchCurrentView(this.devicesView);
            this.devicesView.show();
            this.sideNavView.setCurTab('devices');
        },

        showInvitations: function() {
            this.switchCurrentView(this.invitationsView);
            this.invitationsView.show();
            this.sideNavView.setCurTab('invitations');
        },

        showShareAdminRepos: function() {
            this.switchCurrentView(this.shareAdminReposView);
            this.shareAdminReposView.show();
            this.sideNavView.setCurTab('share-admin-repos');
        },

        showShareAdminFolders: function() {
            this.switchCurrentView(this.shareAdminFoldersView);
            this.shareAdminFoldersView.show();
            this.sideNavView.setCurTab('share-admin-folders');
        },

        showShareAdminShareLinks: function() {
            this.switchCurrentView(this.shareAdminShareLinksView);
            this.shareAdminShareLinksView.show();
            this.sideNavView.setCurTab('share-admin-links');
        },

        showShareAdminUploadLinks: function() {
            this.switchCurrentView(this.shareAdminUploadLinksView);
            this.shareAdminUploadLinksView.show();
            this.sideNavView.setCurTab('share-admin-links');
        }

    });

    return Router;
});

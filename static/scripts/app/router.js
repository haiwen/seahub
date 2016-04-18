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
    'app/views/devices',
    'app/views/activities',
    'app/views/notifications',
    'app/views/account'
], function($, Backbone, Common, SideNavView, MyReposView,
    SharedReposView, GroupsView, GroupView,
    OrgView, DirView, StarredFileView, DevicesView, ActivitiesView,
    NotificationsView, AccountView) {
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
            // Default
            '*actions': 'showRepos'
        },

        initialize: function() {
            $('#initial-loading-view').hide();

            Common.prepareApiCsrf();
            Common.initLocale();
            //Common.initAccountPopup();
            //Common.initNoticePopup();

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
            this.activitiesView = new ActivitiesView();

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

        showDevices: function() {
            this.switchCurrentView(this.devicesView);
            this.devicesView.show();
            this.sideNavView.setCurTab('devices');
        },

        showActivities: function() {
            this.switchCurrentView(this.activitiesView);
            this.activitiesView.show();
            this.sideNavView.setCurTab('activities');
        }

    });

    return Router;
});

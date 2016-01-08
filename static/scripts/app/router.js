/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'app/views/side-nav',
    'app/views/myhome',
    'app/views/groups',
    'app/views/group',
    'app/views/organization',
    'app/views/dir'
], function($, Backbone, Common, SideNavView, MyHomeView, GroupsView, GroupView,
    OrgView, DirView) {
    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            '': 'showRepos',
            'my-libs/': 'showMyRepos',
            'my-libs/lib/:repo_id(/*path)': 'showMyRepoDir',
            'my-sub-libs/': 'showMySubRepos',
            'my-sub-libs/lib/:repo_id(/*path)': 'showMySubRepoDir',
            'shared-libs/': 'showSharedRepos',
            'shared-libs/lib/:repo_id(/*path)': 'showSharedRepoDir',
            'groups/': 'showGroups',
            'group/:group_id/': 'showGroupRepos',
            'group/:group_id/lib/:repo_id(/*path)': 'showGroupRepoDir',
            'group/:group_id/members/': 'showGroupMembers',
            'group/:group_id/settings/': 'showGroupSettings',
            'org/': 'showOrgRepos',
            'org/lib/:repo_id(/*path)': 'showOrgRepoDir',
            'common/lib/:repo_id(/*path)': 'showCommonDir',
            'starred/': 'showStarredFile',
            'activities/': 'showActivities',
            // Default
            '*actions': 'showRepos'
        },

        initialize: function() {
            Common.prepareApiCsrf();
            Common.initAccountPopup();
            Common.initNoticePopup();

            this.sideNavView = new SideNavView();

            this.dirView = new DirView();

            this.myHomeView = new MyHomeView({dirView: this.dirView});
            this.groupView = new GroupView({dirView: this.dirView});
            this.orgView = new OrgView({dirView: this.dirView});

            this.groupsView = new GroupsView();

            this.currentView = this.myHomeView;

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
            this.switchCurrentView(this.myHomeView);
            if (app.pageOptions.can_add_repo) {
                this.myHomeView.showMyRepos();
            } else {
                this.myHomeView.showSharedRepos();
                this.sideNavView.setCurTab('shared');
            }
        },

        showMyRepos: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showMyRepos();
            this.sideNavView.setCurTab('mine');
        },

        showMySubRepos: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showMySubRepos();
        },

        showSharedRepos: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showSharedRepos();
            this.sideNavView.setCurTab('shared');
        },

        showStarredFile: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showStarredFile();
            this.sideNavView.setCurTab('starred');
        },

        showActivities: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showActivities();
            this.sideNavView.setCurTab('activities');
        },

        showMyRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showDir('my-libs', repo_id, path);
            this.sideNavView.setCurTab('mine');
        },

        showCommonDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showDir('common', repo_id, path);
        },

        showMySubRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showDir('my-sub-libs', repo_id, path);
            this.sideNavView.setCurTab('sub-libs');
        },

        showSharedRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showDir('shared-libs', repo_id, path);
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

        showGroupRepos: function(group_id) {
            this.switchCurrentView(this.groupView);
            this.groupView.showRepoList(group_id);
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
            this.switchCurrentView(this.groupView);
            this.groupView.showDir(group_id, repo_id, path);
            this.sideNavView.setCurTab('group', {
                'cur_group_tab': '',
                'cur_group_id': group_id
            });
        },

        showGroupMembers: function(group_id) {
            this.showGroupRepos(group_id);
            this.groupView.showMembers();
        },

        showGroupSettings: function(group_id) {
            this.showGroupRepos(group_id);
            this.groupView.showSettings();
        },

        showOrgRepos: function() {
            this.switchCurrentView(this.orgView);
            this.orgView.showRepoList();
            this.sideNavView.setCurTab('org');
        },

        showOrgRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.orgView);
            this.orgView.showDir(repo_id, path);
            this.sideNavView.setCurTab('org');
        }

    });

    return Router;
});

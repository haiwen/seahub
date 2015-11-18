/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'app/views/myhome',
    'app/views/group',
    'app/views/groups',
    'app/views/organization',
    'app/views/dir'
], function($, Backbone, Common, MyHomeView, GroupView, GroupsView, OrgView,
    DirView) {
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
            'group/': 'showGroups',
            'group/:group_id/': 'showGroupRepos',
            'group/:group_id/lib/:repo_id(/*path)': 'showGroupRepoDir',
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

            this.dirView = new DirView();

            this.myHomeView = new MyHomeView({dirView: this.dirView});
            this.groupView = new GroupView({dirView: this.dirView});
            this.groupsView = new GroupsView({dirView: this.dirView});
            this.orgView = new OrgView({dirView: this.dirView});

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
            }
        },

        showMyRepos: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showMyRepos();
        },

        showMySubRepos: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showMySubRepos();
        },

        showSharedRepos: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showSharedRepos();
        },

        showStarredFile: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showStarredFile();
        },

        showActivities: function() {
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showActivities();
        },

        showMyRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showDir('my-libs', repo_id, path);
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
        },

        showSharedRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showDir('shared-libs', repo_id, path);
            this.myHomeView.sideNavView.show({'cur_tab': 'shared'});
        },

        showGroups: function() {
            this.switchCurrentView(this.groupsView);
            this.myHomeView.sideNavView.show({'cur_tab': 'allgroup'});
        },

        showGroupRepos: function(group_id) {
            this.switchCurrentView(this.groupView);
            this.groupView.showRepoList(group_id);
            var group_scrollTop = this.myHomeView.sideNavView.$el.children('.side-tabnav-tabs-groups').scrollTop();
            this.myHomeView.sideNavView.show({'cur_tab': 'group', 'cur_group_tab': group_id, 'group_scrollTop': group_scrollTop});
        },

        showGroupRepoDir: function(group_id, repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.groupView);
            this.groupView.showDir(group_id, repo_id, path);
        },

        showOrgRepos: function() {
            this.switchCurrentView(this.orgView);
            this.orgView.showRepoList();
            this.myHomeView.sideNavView.show({'cur_tab': 'org'});
        },

        showOrgRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.orgView);
            this.orgView.showDir(repo_id, path);
        }

    });

    return Router;
});

/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'app/views/myhome',
    'app/views/group',
    'app/views/organization',
    'app/views/dir',
    'app/views/top-group-nav'
], function($, Backbone, Common, MyHomeView, GroupView, OrgView,
    DirView, GroupNavView) {
    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            '': 'showMyRepos',
            'my-libs/': 'showMyRepos',
            'my-libs/lib/:repo_id(/*path)': 'showMyRepoDir',
            'my-sub-libs/': 'showMySubRepos',
            'my-sub-libs/lib/:repo_id(/*path)': 'showMySubRepoDir',
            'shared-libs/': 'showSharedRepos',
            'shared-libs/lib/:repo_id(/*path)': 'showSharedRepoDir',
            'group/:group_id/': 'showGroupRepos',
            'group/:group_id/lib/:repo_id(/*path)': 'showGroupRepoDir',
            'org/': 'showOrgRepos',
            'org/lib/:repo_id(/*path)': 'showOrgRepoDir',
            'common/lib/:repo_id(/*path)': 'showCommonDir',
            'starred/': 'showStarredFile',
            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            Common.prepareApiCsrf();
            Common.initAccountPopup();
            Common.initNoticePopup();

            this.dirView = new DirView();

            this.myHomeView = new MyHomeView({dirView: this.dirView});
            this.groupView = new GroupView({dirView: this.dirView});
            this.orgView = new OrgView({dirView: this.dirView});

            this.currentView = this.myHomeView;

            if (app.pageOptions.top_nav_groups.length > 0) {
                this.topGroupNavView = new GroupNavView();
            }

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
        },

        showGroupRepos: function(group_id) {
            this.switchCurrentView(this.groupView);
            this.groupView.showRepoList(group_id);
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
        },

        showOrgRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.orgView);
            this.orgView.showDir(repo_id, path);
        },

        defaultAction: function(actions) {
            // We have no matching route, lets just log what the URL was

            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showMyRepos();
        }
    });

    return Router;
});

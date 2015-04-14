/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'app/views/myhome',
    'app/views/group',
    'app/views/organization',
    'app/views/group-nav',
], function($, Backbone, Common, MyHomeView, GroupView, OrgView,
    GroupNavView) {
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

            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            Common.prepareApiCsrf();
            Common.initAccountPopup();
            Common.initNoticePopup();

            this.myHomeView = new MyHomeView();
            this.groupView = new GroupView();
            this.orgView = new OrgView();
            this.currentView = this.myHomeView;

            this.groupNavView = new GroupNavView();
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

        showMyRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showDir('my-libs', repo_id, path);
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
            console.log('No route:', actions);

            this.switchCurrentView(this.myHomeView);
            this.myHomeView.showMyRepos();
        }
    });

    return Router;
});

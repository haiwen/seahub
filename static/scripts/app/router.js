/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'app/views/myhome',
    'app/views/group',
    'app/views/Organization',
    'app/views/group-nav',
], function($, Backbone, Common, MyHomeView, GroupView, orgView,
    GroupNavView) {
    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            'my-libs': 'showMyRepos',
            'my-libs/lib/:repo_id(/*path)': 'showMyRepoDir',
            'my-sub-libs': 'showMySubRepos',
            'my-sub-libs/lib/:repo_id(/*path)': 'showMySubRepoDir',
            'shared-libs': 'showSharedRepos',
            'shared-libs/lib/:repo_id(/*path)': 'showSharedRepoDir',
            'group/:group_id/': 'showGroupRepos',
            'group/:group_id/:repo_id(/*path)': 'showGroupRepoDir',
            'org': 'showOrgRepos',
            'org/:repo_id(/*path)': 'showOrgRepoDir',

            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            Common.prepareApiCsrf();
            Common.initAccountPopup();
            Common.initNoticePopup();

            this.myHomeView = new MyHomeView();
            this.groupView = new GroupView();
            this.orgView = new orgView();
            this.currentView = this.myHomeView;

            this.groupNavView = new GroupNavView();
        },

        showMyRepos: function() {
            this.currentView.hide();
            this.currentView = this.myHomeView;
            this.myHomeView.showMyRepos();
        },

        showMySubRepos: function() {
            this.currentView.hide();
            this.currentView = this.myHomeView;
            this.myHomeView.showMySubRepos();
        },

        showSharedRepos: function() {
            this.currentView.hide();
            this.currentView = this.myHomeView;
            this.myHomeView.showSharedRepos();
        },

        showMyRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.currentView.hide();
            this.currentView = this.myHomeView;
            this.myHomeView.showDir('my-libs', repo_id, path);
        },

        showMySubRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.currentView.hide();
            this.currentView = this.myHomeView;
            this.myHomeView.showDir('my-sub-libs', repo_id, path);
        },

        showSharedRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.currentView.hide();
            this.currentView = this.myHomeView;
            this.myHomeView.showDir('shared-libs', repo_id, path);
        },

        showGroupRepos: function(group_id) {
            this.currentView.hide();
            this.currentView = this.groupView;
            this.groupView.showRepoList(group_id);
        },

        showGroupRepoDir: function(group_id, repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.currentView.hide();
            this.currentView = this.groupView;
            this.groupView.showDir(group_id, repo_id, path);
        },

        showOrgRepos: function() {
            this.currentView.hide();
            this.currentView = this.orgView;
            this.orgView.showRepoList();
        },

        showOrgRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.currentView.hide();
            this.currentView = this.orgView;
            this.orgView.showDir(repo_id, path);
        },

        defaultAction: function(actions) {
            // We have no matching route, lets just log what the URL was
            console.log('No route:', actions);

            this.myHomeView.showMyRepos();
        }
    });

    return Router;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/groups',
    'app/views/myhome-repos',
    'app/views/myhome-sub-repos',
    'app/views/myhome-shared-repos',
    'app/views/dir',
    'app/views/myhome-side-nav'
], function($, _, Backbone, Common, GroupCollection,
        ReposView, SubReposView, SharedReposView, DirView, MyhomeSideNavView) {
    'use strict';

    var MyHomeView = Backbone.View.extend({
        el: '#main',

        initialize: function() {
            this.$cont = this.$('#right-panel');

            this.sideNavView = new MyhomeSideNavView();
            this.reposView = new ReposView();
            this.subReposView = new SubReposView();
            this.sharedReposView = new SharedReposView();
            this.dirView = new DirView();
            this.currentView = this.reposView;

            $('#initial-loading-view').hide();
        },

        showSideNav: function () {
            this.sideNavView.show();
        },

        ajaxLoadingShow: function() {
            Common.feedback('Loading...', 'info', Common.INFO_TIMEOUT);
        },

        ajaxLoadingHide: function() {
            $('.messages .info').hide();
        },

        hideLoading: function() {
            this.$cont.find('.loading').hide();
        },

        showLoading: function() {
            this.$cont.find('.loading').show();
        },

        showMyRepos: function() {
            this.showSideNav();
            this.currentView.hide();
            this.reposView.show();
            this.currentView = this.reposView;
        },

        showMySubRepos: function() {
            this.showSideNav();
            this.currentView.hide();
            this.subReposView.show();
            this.currentView = this.subReposView;
        },

        showSharedRepos: function() {
            this.showSideNav();
            this.currentView.hide();
            this.sharedReposView.show();
            this.currentView = this.sharedReposView;
        },

        showDir: function(category, repo_id, path) {
            this.showSideNav();
            var path = path || '/';
            this.currentView.hide();
            this.dirView.showDir(category, repo_id, path);
            this.currentView = this.dirView;
        },

        hide: function() {
            this.currentView.hide();
            this.sideNavView.hide();
        }

    });

    return MyHomeView;
});

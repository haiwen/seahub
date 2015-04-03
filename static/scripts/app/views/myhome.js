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
    'app/views/group-nav',
], function($, _, Backbone, Common, GroupCollection,
        ReposView, SubReposView, SharedReposView, DirView, GroupNavView) {
    'use strict';

    var MyHomeView = Backbone.View.extend({
        el: '#main',

        initialize: function() {
            Common.prepareApiCsrf();

            //_.bindAll(this, 'ajaxLoadingShow', 'ajaxLoadingHide');
            //this.$el.ajaxStart(this.ajaxLoadingShow).ajaxStop(this.ajaxLoadingHide);

            this.$cont = this.$('#right-panel');

            this.reposView = new ReposView();
            this.subReposView = new SubReposView();
            this.sharedReposView = new SharedReposView();
            this.dirView = new DirView();
            this.groupView = new GroupNavView();
            this.currentView = this.reposView;

            Common.initAccountPopup();
            Common.initNoticePopup();

            $('#initial-loading-view').hide();
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
            this.currentView.hide();
            this.reposView.show();
            this.currentView = this.reposView;
        },

        showMySubRepos: function() {
            this.currentView.hide();
            this.subReposView.show();
            this.currentView = this.subReposView;
        },

        showSharedRepos: function() {
            this.currentView.hide();
            this.sharedReposView.show();
            this.currentView = this.sharedReposView;
        },

        showDir: function(category, repo_id, path) {
            var path = path || '/';
            this.currentView.hide();
            this.dirView.showDir(category, repo_id, path);
            this.currentView = this.dirView;
        }


    });

    return MyHomeView;
});

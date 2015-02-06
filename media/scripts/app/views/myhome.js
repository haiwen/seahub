define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/groups',
    'app/views/myhome-repos',
    'app/views/myhome-shared-repos',
    'app/views/dir',
    'app/views/group-nav',
], function($, _, Backbone, Common, GroupCollection,
        ReposView, SharedReposView, DirView, GroupNavView) {
    'use strict';

    var MyHomeView = Backbone.View.extend({
        el: '#main',

        initialize: function() {
            console.log('init MyHomePage');
            Common.prepareApiCsrf();

            //_.bindAll(this, 'ajaxLoadingShow', 'ajaxLoadingHide');
            //this.$el.ajaxStart(this.ajaxLoadingShow).ajaxStop(this.ajaxLoadingHide);

            this.$cont = this.$('#right-panel');

            this.reposView = new ReposView();
            this.sharedReposView = new SharedReposView();
            this.dirView = new DirView();
            this.groupView = new GroupNavView();
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
            console.log('show repo list');
            this.sharedReposView.hide();
            this.reposView.show();
            this.dirView.hide();
        },

        showSharedRepos: function() {
            this.dirView.hide();
            this.reposView.hide();
            this.sharedReposView.show();
        },

        showDir: function(category, repo_id, path) {
            console.log('show dir ' + repo_id + ' ' + path);

            var path = path || '/';
            this.reposView.hide();
            this.dirView.showDir(category, repo_id, path);
            // this.dirent_list = new app.DirentListView({id: id, path: path});
            // $('#my-own-repos table').children().remove();
            // $('#my-own-repos table').append(this.dirent_list.render().el);
        },


    });

    return MyHomeView;
});

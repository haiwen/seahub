define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/groups',
    'app/views/myhome-repos',
    'app/views/dir',
    'app/views/group-nav',
], function($, _, Backbone, Common, GroupCollection,
        ReposView, DirView, GroupNavView) {
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

        showRepoList: function() {
            console.log('show repo list');
            this.reposView.show();
            this.dirView.hide();
        },

        showDir: function(repo_id, path) {
            console.log('show dir ' + repo_id + ' ' + path);

            var path = path || '/';
            this.reposView.hide();
            this.dirView.showDir(repo_id, path);
            // this.dirent_list = new app.DirentListView({id: id, path: path});
            // $('#my-own-repos table').children().remove();
            // $('#my-own-repos table').append(this.dirent_list.render().el);
        },


    });

    return MyHomeView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
    'app/collections/dirents',
    'app/collections/groups',
    'app/views/repos',
    'app/views/dirents',
    'app/views/dir',
    'app/views/group-nav',
    'app/views/add-repo'
], function($, _, Backbone, Common, Repos, DirentCollection, GroupCollection,
        RepoView, DirentView, DirView, GroupNavView, AddRepoView) {
    'use strict';

    var MyHomeView = Backbone.View.extend({
        el: '#main',

        events: {
            'click #repo-create': 'createRepo',
        },

        initialize: function() {
            console.log('init MyHomePage');
            Common.prepareApiCsrf();

            _.bindAll(this, 'ajaxLoadingShow', 'ajaxLoadingHide');
            this.$el.ajaxStart(this.ajaxLoadingShow).ajaxStop(this.ajaxLoadingHide);

            // this.on('showDirents', this.showDirents, this);

            this.$repoTabs = this.$('#repo-tabs');

            this.$cont = this.$('#right-panel');
            this.$table = this.$('#my-own-repos table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);

            this.dirView = new DirView();

            this.groupView = new GroupNavView();
        },

        initializeRepos: function() {
            this.listenTo(Repos, 'add', this.addOne);
            this.listenTo(Repos, 'reset', this.addAll);
            // this.listenTo(Repos, 'sync', this.render);
            this.listenTo(Repos, 'all', this.render);
        },

        ajaxLoadingShow: function() {
            Common.feedback('Loading...', 'info', Common.INFO_TIMEOUT);
        },

        ajaxLoadingHide: function() {
            $('.messages .info').hide();
        },

        addOne: function(repo, collection, options) {
            console.log('add repo: ' + repo.get('name'));
            var view = new RepoView({model: repo});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        addAll: function() {
            this.$tableBody.empty();
            Repos.each(this.addOne, this);
        },

        hideTable: function() {
            this.$table.hide();
        },

        showTable: function() {
            this.$table.show();
        },

        hideLoading: function() {
            this.$cont.find('.loading').hide();
        },

        showLoading: function() {
            this.$cont.find('.loading').show();
        },

        hideEmptyTips: function() {
            this.$cont.find('.empty-tips').hide();
        },

        showEmptyTips: function() {
            this.$cont.find('.empty-tips').show();
        },
        
        render: function(eventName) {
            console.log('render repos with event: ' + eventName);

            this.$repoTabs.show();
            this.$table.parent().show();
            this.hideLoading();
            
            if (Repos.length) {
                this.hideEmptyTips();
                this.showTable();
            } else {
                this.showEmptyTips();
                this.hideTable();
            }
        },

        showRepoList: function() {
            console.log('show repo list');
            this.initializeRepos();
            Repos.fetch({reset: true});

            this.dirView.hide();
        },

        showDir: function(repo_id, path) {
            console.log('show dir ' + repo_id + ' ' + path);
            this.$repoTabs.hide();

            var path = path || '/';
            this.dirView.showDir(repo_id, path);
            // this.dirent_list = new app.DirentListView({id: id, path: path});
            // $('#my-own-repos table').children().remove();
            // $('#my-own-repos table').append(this.dirent_list.render().el);
        },

        createRepo: function() {
            new AddRepoView();
        }


        /*
        addOneDirent: function(dirent) {
            var view = new DirentView({model: dirent});
            this.$repoList.append(view.render().el);
        },

        addAllDirent: function() {
            this.$repoList.empty();
            this.dirents.each(this.addOneDirent, this);
        },

        renderDirent: function(eventName) {
            console.log('render dirents with event: ' + eventName);
            if (this.dirents.length) {
                this.$mine.show();
            }
        },*/
        

    });

    return MyHomeView;
});

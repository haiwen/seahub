define([
    'jquery',
    'underscore',
    'backbone',
    'app/collections/repos',
    'app/collections/dirents',
    'app/collections/groups',
    'app/views/repos',
    'app/views/dirents',
    'app/views/dir',
    'app/views/group-nav'
], function($, _, Backbone, Repos, DirentCollection, GroupCollection,
        RepoView, DirentView, DirView, GroupNavView) {
    'use strict';

    var MyHomeView = Backbone.View.extend({
        el: '#main',

        initialize: function() {
            console.log('init MyHomePage');
            // this.on('showDirents', this.showDirents, this);

            this.$mine = this.$('#my-own-repos');
            this.$repoTabs = this.$('#repo-tabs');
            this.$repoList = this.$('#my-own-repos table tbody');
            this.dirView = new DirView();

            this.groupView = new GroupNavView();
        },

        initializeRepos: function() {
            this.listenTo(Repos, 'add', this.addOne);
            this.listenTo(Repos, 'reset', this.addAll);
            // this.listenTo(Repos, 'sync', this.render);
            this.listenTo(Repos, 'all', this.render);
        },

        addOne: function(repo) {
            console.log('add repo: ' + repo.owner);
            var view = new RepoView({model: repo});
            this.$repoList.append(view.render().el);
        },

        addAll: function() {
            this.$repoList.empty();
            Repos.each(this.addOne, this);
        },

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
        },

        render: function(eventName) {
            console.log('render repos with event: ' + eventName);
            if (Repos.length) {
                this.$mine.show();
            }
        },

        showRepoList: function() {
            console.log('show repo list');
            this.initializeRepos();
            Repos.fetch({reset: true});
            this.dirView.hide();
            this.$repoTabs.show();
            // $('#my-own-repos table').append(new RepoView().render().el);
        },

        showDir: function(repo_id, path) {
            console.log('show dir ' + repo_id + ' ' + path);
            this.$repoTabs.hide();

            var path = path || '/';
            this.dirView.showDir(repo_id, path);
            // this.dirent_list = new app.DirentListView({id: id, path: path});
            // $('#my-own-repos table').children().remove();
            // $('#my-own-repos table').append(this.dirent_list.render().el);
        }

    });

    return MyHomeView;
});

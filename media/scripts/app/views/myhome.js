define([
    'jquery',
    'underscore',
    'backbone',
    'app/collections/repos',
    'app/collections/dirents',
    'app/views/repos',
    'app/views/dirents'
], function($, _, Backbone, Repos, DirentCollection, RepoView, DirentView) {
    'use strict';

    var MyHomeView = Backbone.View.extend({
        el: '#main',

        initialize: function() {
            console.log('init MyHomePage');
            // this.on('showDirents', this.showDirents, this);

            this.$mine = this.$('#my-own-repos');
            this.$repoList = this.$('#my-own-repos table');

        },

        initializeRepos: function() {
            this.listenTo(Repos, 'add', this.addOne);
            this.listenTo(Repos, 'reset', this.addAll);
            // this.listenTo(Repos, 'sync', this.render);
            this.listenTo(Repos, 'all', this.render);
        },

        initializeDirents: function() {
            this.listenTo(this.dirents, 'add', this.addOneDirent);
            this.listenTo(this.dirents, 'reset', this.addAllDirent);
            // this.listenTo(this.dirents, 'sync', this.render);
            this.listenTo(this.dirents, 'all', this.renderDirent);
        },
        
        addOne: function(repo) {
            console.log('add repo: ' + repo);
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
            // $('#my-own-repos table').append(new RepoView().render().el);
        },

        showDirentList: function(id, path) {
            console.log('show repo page and hide repo list: ' + id + ' ' + path);

            var path = path || '/';
            this.dirents = new DirentCollection(id, path);
            this.initializeDirents();

            this.dirents.fetch({reset: true});

            // this.dirent_list = new app.DirentListView({id: id, path: path});
            // $('#my-own-repos table').children().remove();
            // $('#my-own-repos table').append(this.dirent_list.render().el);
        }
        
    });

    return MyHomeView;
});

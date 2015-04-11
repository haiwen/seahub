define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/pub-repos',
    'app/views/organization-repo',
    'app/views/dir',
    'app/views/add-pub-repo'
], function($, _, Backbone, Common, PubRepoCollection, OrganizationRepoView,
    DirView, AddPubRepoView) {
    'use strict';

    var OrganizationView = Backbone.View.extend({
        el: '#main',

        initialize: function() {

            this.$reposDiv = $('#organization-repos');
            this.$table = $('#organization-repos table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('#organization-repos .loading-tip');
            this.$emptyTip = $('#organization-repos .empty-tips');

            this.repos = new PubRepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.dirView = new DirView();
        },

        events: {
            'click #repo-create': 'createRepo',
            'click #organization-repos .by-name': 'sortByName',
            'click #organization-repos .by-time': 'sortByTime'
        },

        createRepo: function() {
            new AddPubRepoView(this.repos).render();
        },

        addOne: function(repo, collection, options) {
            var view = new OrganizationRepoView({model: repo, collection: this.repos});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        reset: function() {
            this.$tableBody.empty();
            this.repos.each(this.addOne, this);
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
            this.$loadingTip.hide();
        },

        showRepoList: function() {
            this.dirView.hide();
            this.$reposDiv.show();
            this.repos.fetch({reset: true});
            this.$loadingTip.show();
        },

        hideRepoList: function() {
            this.$reposDiv.hide();
        },

        showDir: function(repo_id, path) {
            var path = path || '/';
            this.hideRepoList();
            this.dirView.showDir('org', repo_id, path);
            // this.dirent_list = new app.DirentListView({id: id, path: path});
            // $('#my-own-repos table').children().remove();
            // $('#my-own-repos table').append(this.dirent_list.render().el);
        },

        sortByName: function() {
            var repos = this.repos;
            console.log(repos);
            var el = $('.by-name', this.$table);
            repos.comparator = function(a, b) { // a, b: model
                if (el.hasClass('icon-caret-up')) {
                    return a.get('name').toLowerCase() < b.get('name').toLowerCase() ? 1 : -1;
                } else {
                    return a.get('name').toLowerCase() < b.get('name').toLowerCase() ? -1 : 1;
                }
            };
            repos.sort();
            this.$tableBody.empty();
            repos.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down');
        },

        sortByTime: function() {
            var repos = this.repos;
            var el = $('.by-time', this.$table);
            repos.comparator = function(a, b) { // a, b: model
                if (el.hasClass('icon-caret-down')) {
                    return a.get('mtime') < b.get('mtime') ? 1 : -1;
                } else {
                    return a.get('mtime') < b.get('mtime') ? -1 : 1;
                }
            };
            repos.sort();
            this.$tableBody.empty();
            repos.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down');
        },

        hide: function() {
            this.hideRepoList();
            this.dirView.hide();
        }

    });

    return OrganizationView;
});

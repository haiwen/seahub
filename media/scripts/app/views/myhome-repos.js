define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
    'app/views/repo',
    'app/views/add-repo',
], function($, _, Backbone, Common, RepoCollection, RepoView, AddRepoView) {
    'use strict';

    var ReposView = Backbone.View.extend({
        el: $('#repo-tabs'),

        events: {
            'click #repo-create': 'createRepo',
            'click #my-own-repos .by-name': 'sortByName',
            'click #my-own-repos .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.$tabs = $('#repo-tabs');
            this.$table = this.$('#my-own-repos table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('.loading-tip', this.$tabs);
            this.$emptyTip = $('#my-own-repos .empty-tips');

            this.repos = new RepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
        },

        addOne: function(repo, collection, options) {
            var view = new RepoView({model: repo});
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

        showMyRepos: function() {
            this.repos.fetch({reset: true});
            this.$tabs.show();
            this.$table.hide();
            this.$loadingTip.show();
            $('#mylib-tab', this.$tabs).parent().addClass('ui-state-active');
        },

        show: function() {
            $('#repo-create').show();
            this.showMyRepos();
        },

        hide: function() {
            $('#repo-create').hide();
            this.$el.hide();
            this.$table.hide();
            $('#mylib-tab', this.$tabs).parent().removeClass('ui-state-active');
        },

        createRepo: function() {
            var addRepoView = new AddRepoView(this.repos);
            addRepoView.render();
        },

        sortByName: function() {
            var repos = this.repos;
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
        }

    });

    return ReposView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/pub-repos',
    'app/views/organization-repo',
    'app/views/add-pub-repo'
], function($, _, Backbone, Common, PubRepoCollection, OrganizationRepoView,
    AddPubRepoView) {
    'use strict';

    var OrganizationView = Backbone.View.extend({
        el: '#main',

        initialize: function(options) {

            this.$sideNav = $('#org-side-nav');
            this.$reposDiv = $('#organization-repos');
            this.$table = $('#organization-repos table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('#organization-repos .loading-tip');
            this.$emptyTip = $('#organization-repos .empty-tips');

            this.repos = new PubRepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.dirView = options.dirView;
        },

        events: {
            'click #organization-repos .repo-create': 'createRepo',
            'click #organization-repos .by-name': 'sortByName',
            'click #organization-repos .by-time': 'sortByTime'
        },

        createRepo: function() {
            new AddPubRepoView(this.repos);
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
            this.$sideNav.show();
            this.dirView.hide();
            this.$reposDiv.show();
            this.repos.fetch({reset: true});
            this.$loadingTip.show();
        },

        hideRepoList: function() {
            this.$reposDiv.hide();
        },

        showDir: function(repo_id, path) {
            this.$sideNav.show();
            var path = path || '/';
            this.hideRepoList();
            this.dirView.showDir('org', repo_id, path);
        },

        sortByName: function() {
            var repos = this.repos;
            var el = $('.by-name', this.$table);
            repos.comparator = function(a, b) { // a, b: model
                var result = Common.compareTwoWord(a.get('name'), b.get('name'));
                if (el.hasClass('icon-caret-up')) {
                    return -result;
                } else {
                    return result;
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
            this.$sideNav.hide();
            this.hideRepoList();
            this.$emptyTip.hide();
            this.dirView.hide();
        }

    });

    return OrganizationView;
});

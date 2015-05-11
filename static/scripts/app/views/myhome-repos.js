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
            'click .repo-create': 'createRepo',
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
            this.$repoCreateBtn = this.$('.repo-create');

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
                // Show guide popup when there is no owned repos and guide flag is true.
                if (app.pageOptions.guide_enabled) {
                    $('#guide-for-new').modal({appendTo: '#main', focus:false});
                    app.pageOptions.guide_enabled = false;
                }
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
            this.$repoCreateBtn.show();
            this.showMyRepos();
        },

        hide: function() {
            this.$repoCreateBtn.hide();
            this.$el.hide();
            this.$table.hide();
            this.$emptyTip.hide();
            $('#mylib-tab', this.$tabs).parent().removeClass('ui-state-active');
        },

        createRepo: function() {
            new AddRepoView(this.repos);
        },

        sortByName: function() {
            var repos = this.repos;
            var el = $('.by-name', this.$table);
            if (el.hasClass('icon-caret-up')) {
                repos.comparator = function(a, b) { // a, b: model
                    return -Common.compareTwoWord(a.get('name'), b.get('name'));
                };
            } else {
                repos.comparator = function(a, b) { // a, b: model
                    return Common.compareTwoWord(a.get('name'), b.get('name'));
                };
            }
            repos.sort().trigger('reset');
            el.toggleClass('icon-caret-up icon-caret-down');
        },

        sortByTime: function() {
            var repos = this.repos;
            var el = $('.by-time', this.$table);
            if (el.hasClass('icon-caret-down')) {
                repos.comparator = function(a, b) { // a, b: model
                    return a.get('mtime') < b.get('mtime') ? 1 : -1;
                };
            } else {
                repos.comparator = function(a, b) { // a, b: model
                    return a.get('mtime') < b.get('mtime') ? -1 : 1;
                };
            }
            repos.sort().trigger('reset');
            el.toggleClass('icon-caret-up icon-caret-down');
        }

    });

    return ReposView;
});

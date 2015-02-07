define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
    'app/views/shared-repo',
], function($, _, Backbone, Common, RepoCollection, SharedRepoView) {
    'use strict';

    var SharedReposView = Backbone.View.extend({
        el: $('#repo-tabs'),

        initialize: function(options) {
            this.$tabs = $('#repo-tabs');
            this.$table = this.$('#repos-shared-to-me table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('.loading-tip', this.$tabs);
            this.$emptyTip = $('.empty-tips', this.tabs);

            this.repos = new RepoCollection({type: 'shared'});
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
        },

        addOne: function(repo, collection, options) {
            var view = new SharedRepoView({model: repo});
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

        renderPath: function() {
            //
        },

        showSharedRepos: function() {
            this.repos.fetch({reset: true});
            this.$tabs.show();
            //this.$table.parent().show();
            this.$table.hide();
            this.$loadingTip.show();
        },

        show: function() {
            this.showSharedRepos();
        },

        hide: function() {
            this.$el.hide();
            this.$table.hide();
        },


    });

    return SharedReposView;
});

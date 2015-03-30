define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
    'app/views/sub-lib',
    'app/views/add-repo',
], function($, _, Backbone, Common, RepoCollection, RepoView, AddRepoView) {
    'use strict';

    var ReposView = Backbone.View.extend({
        el: $('#repo-tabs'),

        events: {
           'click #sub-lib-create': 'createRepo', // TODO
        },

        initialize: function(options) {
            this.$tabs = $('#repo-tabs');
            this.$table = this.$('#my-sub-repos table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('.loading-tip', this.$tabs);
            this.$emptyTip = $('.empty-tips', this.tabs);

            this.repos = new RepoCollection({type: 'sub'});
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
            $('#sublib-tab', this.$tabs).parent().addClass('ui-state-active');
        },

        show: function() {
            $('#sub-lib-create').show();
            this.showMyRepos();
        },

        hide: function() {
            $('#sub-lib-create').hide();
            this.$el.hide();
            this.$table.hide();
            $('#sublib-tab', this.$tabs).parent().removeClass('ui-state-active');
        },

        createRepo: function() {
            var addRepoView = new AddRepoView(this.repos);
            addRepoView.render();
        },


    });

    return ReposView;
});

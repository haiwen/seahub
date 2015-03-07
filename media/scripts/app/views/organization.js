define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
    'app/views/organization-repo'
], function($, _, Backbone, Common, RepoCollection, OrganizationRepoView) {
    'use strict';

    var OrganizationView = Backbone.View.extend({
        el: '#main',

        initialize: function() {

            this.$table = $('#organization-repos table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('#organization-repos .loading-tip');
            this.$emptyTip = $('#organization-repos .empty-tips');

            this.repos = new RepoCollection({type: 'org'});
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
        },

        events: {
            'click #repo-create': 'createRepo'
        },

        createRepo: function() {
            alert('todo');
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

        showPublicRepos: function() {
            this.repos.fetch({reset: true});
        }

    });

    return OrganizationView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'app/collections/dirents',
    'app/views/group-repos',
    'app/views/add-group-repo',
    'app/views/group-recent-change'
    // 'app/views/dirents'
], function($, _, Backbone, Common, Repos, DirentCollection, GroupRepoView, AddGroupRepoView/*, DirentView*/, GroupRecentChangeView) {
    'use strict';

    var GroupView = Backbone.View.extend({
        el: '#main',

        events: {
            'click #repo-create': 'createRepo',
        },

        initialize: function() {
            Common.prepareApiCsrf();

            this.$cont = this.$('#right-panel');

            this.$tab = this.$('#tabs div:first-child');

            this.$table = this.$('#grp-repos table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);

            this.$createForm = this.$('#repo-create-form');
        },

        initializeRepos: function() {
            this.listenTo(Repos, 'add', this.addOne);
            this.listenTo(Repos, 'reset', this.addAll);
            // this.listenTo(Repos, 'sync', this.render);
            this.listenTo(Repos, 'all', this.render); // XXX: really render table when recieve any event ?
            this.listenTo(Repos, 'all', this.all);
        },

        all: function(event) {
            console.log('event: ' + event);
        },

        addOne: function(repo, collection, options) {
            console.log('add repo: ' + repo.get('name'));
            var view = new GroupRepoView({model: repo});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        addAll: function() {
            console.log('add all');
            this.resetTable();
            Repos.each(this.addOne, this);
        },

        // Reset table by empty table body.
        resetTable: function() {
            console.log('rest table');
            this.$tableBody.empty();
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

        render: function(event) {
            console.log('got event: ' + event + ', render repo list...' );

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
            this.initializeRepos();
            Repos.fetch({reset: true});
        },

        createRepo: function() {
            new AddGroupRepoView();
        },

        showChanges: function() {
            this.$table.parent().hide(); // XXX: hide or empty ?

            if (!this.recentChangeView) {
                this.recentChangeView = new GroupRecentChangeView();
            }
            this.recentChangeView.show();
        }

    });

    return GroupView;
});

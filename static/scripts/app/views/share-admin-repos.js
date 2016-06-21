define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/share-admin-repos',
    'app/views/share-admin-repo'
], function($, _, Backbone, Common, ShareAdminRepoCollection, ShareAdminRepoView) {
    'use strict';

    var ShareAdminReposView = Backbone.View.extend({

        id: 'share-admin-repos',

        template: _.template($('#share-admin-repos-tmpl').html()),

        initialize: function() {
            this.repos = new ShareAdminRepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
            this.render();
        },

        events: {
            'click .by-name': 'sortByName'
        },

        sortByName: function() {
            var repos = this.repos;
            var el = $('.by-name .sort-icon', this.$table);
            repos.comparator = function(a, b) { // a, b: model
                var result = Common.compareTwoWord(a.get('repo_name'), b.get('repo_name'));
                if (el.hasClass('icon-caret-up')) {
                    return -result;
                } else {
                    return result;
                }
            };
            repos.sort();
            this.$tableBody.empty();
            repos.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down').show();
            repos.comparator = null;
            return false;
        },

        render: function() {
            this.$el.html(this.template());
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function() {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.showLibraries();
        },

        showLibraries: function() {
            this.initPage();
            this.repos.fetch({
                cache: false,
                reset: true,
                error: function (xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.$tableBody.empty();
                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$table.hide();
                this.$emptyTip.show();
            }
        },

        addOne: function(repo) {
            var view = new ShareAdminRepoView({model: repo});
            this.$tableBody.append(view.render().el);
        }

    });

    return ShareAdminReposView;
});

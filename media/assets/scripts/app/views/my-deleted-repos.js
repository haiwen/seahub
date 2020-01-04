define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/deleted-repos',
    'app/views/deleted-repo'
], function($, _, Backbone, Common, RepoCollection, RepoView) {
    'use strict';

    var ReposView = Backbone.View.extend({
        el: ".main-panel",

        template: _.template($('#my-deleted-repos-tmpl').html()),
        theadTemplate: _.template($('#my-deleted-repos-hd-tmpl').html()),
        theadMobileTemplate: _.template($('#my-deleted-repos-hd-mobile-tmpl').html()),

        events: {
        },

        initialize: function(options) {
            this.repos = new RepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main" id="my-deleted-repos"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$table = this.$('table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

            return this;
        },

        addOne: function(repo, collection, options) {
            var view = new RepoView({model: repo});
            this.$tableBody.append(view.render().el);
        },

        renderThead: function() {
            var tmpl = $(window).width() >= 768 ? this.theadTemplate : this.theadMobileTemplate;
            this.$tableHead.html(tmpl());
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.renderThead();
                this.$tableBody.empty();

                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$table.hide();
                this.$emptyTip.show();
            }
        },

        showRepos: function() {
            this.$table.hide();
            this.$loadingTip.show();
            var _this = this;
            this.repos.fetch({
                cache: false,
                reset: true,
                success: function (collection, response, opts) {
                },
                error: function (collection, response, opts) {
                    _this.$loadingTip.hide();
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    $error.html(err_msg).show();
                }
            });
        },

        show: function() {
            this.renderMainCon();
            this.showRepos();
        },

        hide: function() {
            this.$mainCon.detach();
        }

    });

    return ReposView;
});

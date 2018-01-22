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
        id: "my-deleted-repos",

        template: _.template($('#my-deleted-repos-tmpl').html()),
        reposHdTemplate: _.template($('#my-deleted-repos-hd-tmpl').html()),
        mobileReposHdTemplate: _.template($('#my-deleted-repos-hd-mobile-tmpl').html()),

        events: {
        },

        initialize: function(options) {
            this.repos = new RepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.render();
        },

        render: function() {
            this.$el.html(this.template());
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

        renderReposHd: function() {
            var tmpl = $(window).width() >= 768 ? this.reposHdTemplate : this.mobileReposHdTemplate;
            this.$tableHead.html(tmpl());
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.renderReposHd();
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
                    var $error = _this.$('.error');
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = gettext("Error");
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $error.html(err_msg).show();
                }
            });
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.showRepos();
        },

        hide: function() {
            this.$el.detach();
        }

    });

    return ReposView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'js.cookie',
    'app/collections/repos',
    'app/views/shared-repo',
], function($, _, Backbone, Common, Cookies, RepoCollection, SharedRepoView) {
    'use strict';

    var SharedReposView = Backbone.View.extend({
        id: 'repos-shared-to-me',

        template: _.template($('#repos-shared-to-me-tmpl').html()),
        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),

        initialize: function(options) {
            this.repos = new RepoCollection({type: 'shared'});
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
            this.render();
        },

        addOne: function(repo, collection, options) {
            var view = new SharedRepoView({model: repo, collection: this.repos});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        renderReposHd: function() {
            this.$tableHead.html(this.reposHdTemplate());
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.renderReposHd();
                this.$tableBody.empty();
                this.repos = Common.sortCollection(this.repos);
                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }

            Common.updateSortIconByMode(this);
        },

        showSharedRepos: function() {
            this.$el.show();
            this.$table.hide();
            var $loadingTip = this.$loadingTip;
            $loadingTip.show();
            var _this = this;
            this.repos.fetch({
                reset: true,
                success: function (collection, response, opts) {
                },
                error: function (collection, response, opts) {
                    $loadingTip.hide();
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

        render: function() {
            this.$el.html(this.template());
            this.$table = this.$('table');
            this.$tableHead = this.$('thead');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            return this;
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.showSharedRepos();
        },

        hide: function() {
            this.$el.detach();
        },

        events: {
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime'
        },

        sortByName: function() {
            if (app.pageOptions.sort_mode == 'name_up') {
                // change sort mode
                Cookies.set('sort_mode', 'name_down');
                app.pageOptions.sort_mode = 'name_down';
            } else {
                Cookies.set('sort_mode', 'name_up');
                app.pageOptions.sort_mode = 'name_up';
            }

            Common.updateSortIconByMode(this);
            this.repos = Common.sortCollection(this.repos);

            this.$tableBody.empty();
            this.repos.each(this.addOne, this);
            this.repos.comparator = null;
            return false;
        },

        sortByTime: function() {
            if (app.pageOptions.sort_mode == 'time_down') {
                // change sort mode
                Cookies.set('sort_mode', 'time_up');
                app.pageOptions.sort_mode = 'time_up';
            } else {
                Cookies.set('sort_mode', 'time_down');
                app.pageOptions.sort_mode = 'time_down';
            }

            Common.updateSortIconByMode(this);
            this.repos = Common.sortCollection(this.repos);

            this.$tableBody.empty();
            this.repos.each(this.addOne, this);
            this.repos.comparator = null;

            return false;
        }

    });

    return SharedReposView;
});

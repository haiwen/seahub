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

        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),

        initialize: function(options) {
            this.$tabs = $('#repo-tabs');
            this.$table = $('#repos-shared-to-me table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('.loading-tip', this.$tabs);
            this.$emptyTip = $('#repos-shared-to-me .empty-tips');

            this.repos = new RepoCollection({type: 'shared'});
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
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
                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        showSharedRepos: function() {
            this.$tabs.show();
            $('#shared-lib-tab').parent().addClass('ui-state-active');
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

        show: function() {
            this.showSharedRepos();
        },

        hide: function() {
            this.$el.hide();
            this.$table.hide();
            this.$emptyTip.hide();
            $('#shared-lib-tab', this.$tabs).parent().removeClass('ui-state-active');
        },

        events: {
            'click #repos-shared-to-me .by-name': 'sortByName',
            'click #repos-shared-to-me .by-time': 'sortByTime'
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
            repos.comparator = null;
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
            repos.comparator = null;
        }

    });

    return SharedReposView;
});

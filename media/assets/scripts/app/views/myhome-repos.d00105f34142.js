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

        reposHdTemplate: _.template($('#my-repos-hd-tmpl').html()),

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
                this.$table.hide();
                this.$emptyTip.show();
            }

            if (app.pageOptions.guide_enabled) {
                $('#guide-for-new').modal({appendTo: '#main', focus:false});
                app.pageOptions.guide_enabled = false;
            }
        },

        showMyRepos: function() {
            this.$tabs.show();
            $('#mylib-tab').parent().addClass('ui-state-active');
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

    return ReposView;
});

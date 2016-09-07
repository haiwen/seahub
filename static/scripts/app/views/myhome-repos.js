define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'js.cookie',
    'app/collections/repos',
    'app/views/repo',
    'app/views/add-repo',
], function($, _, Backbone, Common, Cookies, RepoCollection, RepoView, AddRepoView) {
    'use strict';

    var ReposView = Backbone.View.extend({
        id: "my-own-repos",

        template: _.template($('#my-own-repos-tmpl').html()),
        reposHdTemplate: _.template($('#my-repos-hd-tmpl').html()),

        events: {
            'click .repo-create': 'createRepo',
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.repos = new RepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.render();
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
                this.repos = Common.sortCollection(this.repos);
                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$table.hide();
                this.$emptyTip.show();
            }

            Common.updateSortIconByMode(this);

            if (app.pageOptions.guide_enabled) {
                $('#guide-for-new').modal({appendTo: '#main', focus:false});
                $('#simplemodal-container').css({'height':'auto'});
                app.pageOptions.guide_enabled = false;
            }
        },

        showMyRepos: function() {
            this.$table.hide();
            this.$loadingTip.show();
            var _this = this;
            this.repos.fetch({
                cache: false, // for IE
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

        render: function() {
            this.$el.html(this.template());
            this.$table = this.$('table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$repoCreateBtn = this.$('.repo-create');
            return this;
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.showMyRepos();
        },

        hide: function() {
            this.$el.detach();
        },

        createRepo: function() {
            new AddRepoView(this.repos);
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

    return ReposView;
});

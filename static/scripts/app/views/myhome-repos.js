define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
    'app/views/repo',
    'app/views/add-repo',
    'app/views/repo-details',
    'app/views/widgets/dropdown'
], function($, _, Backbone, Common, RepoCollection, RepoView, AddRepoView,
    RepoDetailsView, DropdownView) {
    'use strict';

    var ReposView = Backbone.View.extend({
        id: "my-own-repos",

        template: _.template($('#my-own-repos-tmpl').html()),
        reposHdTemplate: _.template($('#my-repos-hd-tmpl').html()),
        mobileReposHdTemplate: _.template($('#my-repos-hd-mobile-tmpl').html()),

        events: {
            'click .repo-create': 'createRepo',
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime',
            'click #my-libs-more-op a': 'closeDropdown'
        },

        initialize: function(options) {
            this.repos = new RepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.repoDetailsView = new RepoDetailsView();

            this.render();

            this.more_op_dropdown = new DropdownView({
                el: this.$("#my-libs-more-op"),
                right: 0
            })
        },

        addOne: function(repo, collection, options) {
            var view = new RepoView({model: repo, myReposView: this});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
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

                // sort
                Common.updateSortIconByMode({'context': this.$el});
                Common.sortLibs({'libs': this.repos});

                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$table.hide();
                this.$emptyTip.show();
            }

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

            this.repoDetailsView.hide();
        },

        createRepo: function() {
            new AddRepoView(this.repos);
        },

        sortByName: function() {
            Common.toggleSortByNameMode();
            Common.updateSortIconByMode({'context': this.$el});
            Common.sortLibs({'libs': this.repos});

            this.$tableBody.empty();
            this.repos.each(this.addOne, this);
            this.repos.comparator = null;

            return false;
        },

        sortByTime: function() {
            Common.toggleSortByTimeMode();
            Common.updateSortIconByMode({'context': this.$el});
            Common.sortLibs({'libs': this.repos});

            this.$tableBody.empty();
            this.repos.each(this.addOne, this);
            this.repos.comparator = null;

            return false;
        },

        closeDropdown: function() {
            this.more_op_dropdown.hide();
        }

    });

    return ReposView;
});

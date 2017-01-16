define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/pub-repos',
    'app/views/organization-repo',
    'app/views/create-pub-repo',
    'app/views/add-pub-repo',
    'app/views/widgets/dropdown'
], function($, _, Backbone, Common, PubRepoCollection, OrganizationRepoView,
    CreatePubRepoView, AddPubRepoView, DropdownView) {
    'use strict';

    var OrganizationView = Backbone.View.extend({
        id: 'organization',

        template: _.template($('#organization-repos-tmpl').html()),
        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),
        mobileReposHdTemplate: _.template($('#shared-repos-hd-mobile-tmpl').html()),

        initialize: function(options) {
            this.repos = new PubRepoCollection();
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

            this.dropdown = new DropdownView({
                el: this.$('.js-add-pub-lib-dropdown'),
                right: '0px'
            });
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.showRepoList();
        },

        hide: function() {
            this.$el.detach();
        },

        events: {
            'click .share-existing': 'addRepo',
            'click .create-new': 'createRepo',
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime'
        },

        createRepo: function() {
            new CreatePubRepoView(this.repos);
            this.dropdown.hide();
            return false;
        },

        addRepo: function() {
            new AddPubRepoView(this.repos);
            this.dropdown.hide();
            return false;
        },

        addOne: function(repo, collection, options) {
            var view = new OrganizationRepoView({model: repo, collection: this.repos});
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
        },

        showRepoList: function() {
            var $loadingTip = this.$loadingTip;
            $loadingTip.show();
            var _this = this;
            this.repos.fetch({
                cache: false,
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
        }

    });

    return OrganizationView;
});

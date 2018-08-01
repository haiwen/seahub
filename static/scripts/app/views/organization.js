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
        el: '.main-panel',

        template: _.template($('#organization-repos-tmpl').html()),
        toolbarTemplate: _.template($('#org-repos-toolbar-tmpl').html()),
        theadTemplate: _.template($('#shared-repos-hd-tmpl').html()),
        theadMobileTemplate: _.template($('#shared-repos-hd-mobile-tmpl').html()),

        initialize: function(options) {
            this.repos = new PubRepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
        },

        renderToolbar: function() {
            this.$toolbar = $('<div class="cur-view-toolbar" id="org-repos-toolbar"></div>').html(this.toolbarTemplate());
            this.$('.common-toolbar').before(this.$toolbar);

            this.dropdown = new DropdownView({
                el: this.$('#org-repos-toolbar .js-add-pub-lib-dropdown')
            });
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main" id="org-repos"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$table = this.$('table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            return this;
        },

        show: function() {
            this.renderToolbar();
            this.renderMainCon();

            this.showRepoList();
        },

        hide: function() {
            this.$toolbar.detach();
            this.$mainCon.detach();
        },

        events: {
            'click #org-repos-toolbar .share-existing': 'addRepo',
            'click #org-repos-toolbar .create-new': 'createRepo',
            'click #org-repos .by-name': 'sortByName',
            'click #org-repos .by-time': 'sortByTime'
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
                    var $error = _this.$('.error');
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    $error.html(err_msg).show();
                    $loadingTip.hide();
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

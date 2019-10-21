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
        el: '.main-panel',

        template: _.template($('#my-own-repos-tmpl').html()),
        toolbarTemplate: _.template($('#my-repos-toolbar-tmpl').html()),
        theadTemplate: _.template($('#my-repos-thead-tmpl').html()),
        theadMobileTemplate: _.template($('#my-repos-thead-mobile-tmpl').html()),

        events: {
            'click #my-repos-toolbar .repo-create': 'createRepo',
            'click #my-libs-more-op a': 'closeDropdown',

            'click #my-repos .by-name': 'sortByName',
            'click #my-repos .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.repos = new RepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.repoDetailsView = new RepoDetailsView({'parentView': this});
        },

        addOne: function(repo, collection, options) {
            var view = new RepoView({model: repo, myReposView: this});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.renderThead();
                this.$tableBody.empty();

                // sort
                Common.updateSortIconByMode({'context': this.$table});
                Common.sortLibs({'libs': this.repos});

                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$table.hide();
                this.$emptyTip.show();
            }

            if (app.pageOptions.guide_enabled) {
                $('#guide-for-new').modal({focus:false});
                $('#simplemodal-container').css({'height':'auto'});
                app.pageOptions.guide_enabled = false;
            }
        },

        showMyRepos: function() {
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
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    $error.html(err_msg).show();
                }
            });
        },

        renderThead: function() {
            var tmpl = $(window).width() >= 768 ? this.theadTemplate : this.theadMobileTemplate;
            this.$tableHead.html(tmpl());
        },

        renderToolbar: function() {
            this.$toolbar = $('<div class="cur-view-toolbar" id="my-repos-toolbar"></div>').html(this.toolbarTemplate());
            this.$('.common-toolbar').before(this.$toolbar);

            this.more_op_dropdown = new DropdownView({
                el: this.$("#my-libs-more-op")
            });
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main main-panel-main-with-side" id="my-repos"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$table = this.$('table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        show: function() {
            if (!$('#my-repos').length) {
                this.renderToolbar();
                this.renderMainCon();
            }

            this.showMyRepos();
        },

        hide: function() {
            this.$toolbar.detach();
            this.$mainCon.detach();
        },

        createRepo: function() {
            new AddRepoView(this.repos);
        },

        sortByName: function() {
            Common.toggleSortByNameMode();
            Common.updateSortIconByMode({'context': this.$table});
            Common.sortLibs({'libs': this.repos});

            this.$tableBody.empty();
            this.repos.each(this.addOne, this);
            this.repos.comparator = null;

            return false;
        },

        sortByTime: function() {
            Common.toggleSortByTimeMode();
            Common.updateSortIconByMode({'context': this.$table});
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

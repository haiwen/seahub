define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/pub-repos',
    'app/views/organization-repo',
    'app/views/create-pub-repo',
    'app/views/add-pub-repo'
], function($, _, Backbone, Common, PubRepoCollection, OrganizationRepoView,
    CreatePubRepoView, AddPubRepoView) {
    'use strict';

    var OrganizationView = Backbone.View.extend({
        id: 'organization-repos-tmpl',

        template: _.template($('#organization-repos-tmpl').html()),
        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),

        initialize: function(options) {
            this.repos = new PubRepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
            this.render();

            // show/hide 'add lib' menu
            var $add_lib = this.$('#add-pub-lib'),
                $add_lib_menu = this.$('#add-pub-lib-menu');
            $add_lib.on('click', function() {
                $add_lib_menu.toggleClass('hide');
                $add_lib_menu.css({
                    'top': $add_lib.position().top + $add_lib.outerHeight(),
                    'right': 10 // align right with $add_lib
                });
            });

            $('.item', $add_lib_menu).hover(
                function() {
                    $(this).css({'background':'#f3f3f3'});
                },
                function() {
                    $(this).css({'background':'transparent'});
                }
            );
            $(document).click(function(e) {
                Common.closePopup(e, $add_lib_menu, $add_lib);
            });
        },

        render: function() {
            this.$el.html(this.template());
            this.$table = this.$('table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
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
        },

        addRepo: function() {
            new AddPubRepoView(this.repos);
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
            $('.by-time .sort-icon', this.$table).hide();
            var repos = this.repos;
            var el = $('.by-name .sort-icon', this.$table);
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
            el.toggleClass('icon-caret-up icon-caret-down').show();
            repos.comparator = null;
        },

        sortByTime: function() {
            $('.by-name .sort-icon', this.$table).hide();
            var repos = this.repos;
            var el = $('.by-time .sort-icon', this.$table);
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
            el.toggleClass('icon-caret-up icon-caret-down').show();
            repos.comparator = null;
        }

    });

    return OrganizationView;
});

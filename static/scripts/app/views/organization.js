define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/pub-repos',
    'app/views/organization-repo',
    'app/views/create-pub-repo',
    'app/views/add-pub-repo',
    'app/views/myhome'
], function($, _, Backbone, Common, PubRepoCollection, OrganizationRepoView,
    CreatePubRepoView, AddPubRepoView, MyHomeView) {
    'use strict';

    var OrganizationView = Backbone.View.extend({
        el: '#organization-repos',

        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),

        initialize: function(options) {

            this.$reposDiv = $('#organization-repos');
            this.$table = $('#organization-repos table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$path_bar = $('.hd-path', this.$el);
            this.$loadingTip = $('#organization-repos .loading-tip');
            this.$emptyTip = $('#organization-repos .empty-tips');
            
            this.repos = new PubRepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.dirView = options.dirView;
            // show/hide 'add lib' menu
            var $add_lib = $('#add-pub-lib'),
                $add_lib_menu = $('#add-pub-lib-menu');
            $add_lib.click(function() {
                $add_lib_menu.toggleClass('hide');
                $add_lib_menu.css({
                    'top': $add_lib.position().top + $add_lib.outerHeight(),
                    'left': 10 // align right with $add_lib
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

        renderPath: function() {
            var path_link = '<a href="#org/"' + 'class="normal">' + gettext('Organization') + '</a> /';
            this.$path_bar.html(path_link);
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            this.renderPath();
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
            this.dirView.hide();
            this.$reposDiv.show();
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

        hideRepoList: function() {
            this.$reposDiv.hide();
        },

        showDir: function(repo_id, path) {
            var path = path || '/';
            this.hideRepoList();
            this.dirView.showDir('org', repo_id, path);
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
        },

        hide: function() {
            this.hideRepoList();
            this.$emptyTip.hide();
            this.dirView.hide();
        }

    });

    return OrganizationView;
});

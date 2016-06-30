define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/share-admin-repos',
    'app/views/share-admin-repo'
], function($, _, Backbone, Common, ShareAdminRepoCollection, ShareAdminRepoView) {
    'use strict';

    var ShareAdminReposView = Backbone.View.extend({

        id: 'share-admin-repos',

        template: _.template($('#share-admin-repos-tmpl').html()),

        initialize: function() {
            this.repos = new ShareAdminRepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
            this.render();

            var _this = this;
            $(document).click(function(e) {
                var target = e.target || event.srcElement;
                var $select = _this.$('.perm-select:visible');
                if ($select.length && !$select.is(target)) {
                    $select.hide();
                    $select.closest('tr').find('.cur-perm, .perm-edit-icon').show();
                }
            });
        },

        events: {
            'click .by-name': 'sortByName'
        },

        sortByName: function() {
            var repos = this.repos;
            var $el = this.$sortIcon;
            if ($el.hasClass('icon-caret-up')) {
                repos.comparator = function(a, b) { // a, b: model
                    var result = Common.compareTwoWord(a.get('repo_name'), b.get('repo_name'));
                    return -result;
                };
            } else {
                repos.comparator = function(a, b) { // a, b: model
                    var result = Common.compareTwoWord(a.get('repo_name'), b.get('repo_name'));
                    return result;
                };
            }
            repos.sort();
            this.$tableBody.empty();
            repos.each(this.addOne, this);
            $el.toggleClass('icon-caret-up icon-caret-down').show();
            repos.comparator = null;
            return false;
        },

        render: function() {
            this.$el.html(this.template());
            this.$table = this.$('table');
            this.$sortIcon = $('.by-name .sort-icon', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function() {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.showContent();
        },

        showContent: function() {
            var _this = this;
            this.initPage();
            this.repos.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
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

        initPage: function() {
            this.$table.hide();
            this.$sortIcon.attr('class', 'sort-icon icon-caret-down').hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$('.error').hide();
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.$tableBody.empty();
                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$table.hide();
                this.$emptyTip.show();
            }
        },

        addOne: function(repo) {
            var view = new ShareAdminRepoView({model: repo});
            this.$tableBody.append(view.render().el);
        }

    });

    return ShareAdminReposView;
});

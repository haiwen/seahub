define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'app/views/group-repo',
    'app/views/add-group-repo',
    'app/views/group-side-nav'
], function($, _, Backbone, Common, GroupRepos, GroupRepoView,
    AddGroupRepoView, GroupSideNavView) {
    'use strict';

    var GroupView = Backbone.View.extend({
        el: '#group-repo-tabs',

        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),

        events: {
            'click .repo-create': 'createRepo',
            'click #grp-repos .by-name': 'sortByName',
            'click #grp-repos .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.$tabs = this.$el;
            this.$table = this.$('table');
            this.$tableHead = this.$('thead');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

            this.sideNavView = new GroupSideNavView();

            this.repos = new GroupRepos();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.dirView = options.dirView;
        },

        addOne: function(repo, collection, options) {
            var view = new GroupRepoView({
                model: repo,
                group_id: this.group_id,
                is_staff: this.repos.is_staff
            });
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

        showSideNav: function () {
            var sideNavView = this.sideNavView;
            if (sideNavView.group_id && sideNavView.group_id == this.group_id) {
                sideNavView.show();
                return;
            }
            sideNavView.render(this.group_id);
            sideNavView.show();
        },

        showRepoList: function(group_id) {
            this.group_id = group_id;
            this.showSideNav();
            this.dirView.hide();
            this.$emptyTip.hide();
            this.$tabs.show();
            this.$table.hide();
            var $loadingTip = this.$loadingTip;
            $loadingTip.show();
            var _this = this;
            this.repos.setGroupID(group_id);
            this.repos.fetch({
                reset: true,
                data: {from: 'web'},
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
            this.$tabs.hide();
        },

        showDir: function(group_id, repo_id, path) {
            this.group_id = group_id;
            this.showSideNav();
            this.hideRepoList();
            this.dirView.showDir('group/' + this.group_id, repo_id, path);
        },

        createRepo: function() {
            new AddGroupRepoView(this.repos);
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
        },

        hide: function() {
            this.sideNavView.hide();
            this.hideRepoList();
            this.dirView.hide();
            this.$emptyTip.hide();
        }

    });

    return GroupView;
});

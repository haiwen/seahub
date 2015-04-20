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
        el: '#main',

        events: {
            'click #repo-create': 'createRepo',
            'click #grp-repos .by-name': 'sortByName',
            'click #grp-repos .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.$tabs = this.$('#group-repo-tabs');
            this.$table = this.$('#grp-repos table', this.$tabs);
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('.loading-tip', this.$tabs);
            this.$emptyTip = $('.empty-tips', this.$tabs);

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

        reset: function() {
            this.$tableBody.empty();
            this.repos.each(this.addOne, this);
            this.$loadingTip.hide();
            if (this.repos.length) {
                this.$emptyTip.hide();
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
            this.repos.setGroupID(group_id);
            this.repos.fetch({reset: true});
            this.$loadingTip.show();
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
            var addGroupRepoView = new AddGroupRepoView(this.repos);
            addGroupRepoView.render();
        },

        sortByName: function() {
            var repos = this.repos;
            var el = $('.by-name', this.$table);
            repos.comparator = function(a, b) { // a, b: model
                if (el.hasClass('icon-caret-up')) {
                    return a.get('name').toLowerCase() < b.get('name').toLowerCase() ? 1 : -1;
                } else {
                    return a.get('name').toLowerCase() < b.get('name').toLowerCase() ? -1 : 1;
                }
            };
            repos.sort();
            this.$tableBody.empty();
            repos.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down');
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

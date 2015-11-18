define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'app/views/group-repo',
    'app/views/add-group-repo',
    'app/views/myhome'
], function($, _, Backbone, Common, GroupRepos, GroupRepoView,
    AddGroupRepoView, MyHomeView) {
    'use strict';

    var GroupView = Backbone.View.extend({
        el: '#group-repo-tabs',

        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),

        events: {
            'click .repo-create': 'createRepo',
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.$table = this.$('table');
            this.$tableHead = this.$('thead');
            this.$tableBody = this.$('tbody');
            this.$path_bar = this.$('.hd-path');
            this.$group_links = this.$('.group-links');
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

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

        renderGroupLinks: function() {
            var group_links = '';
            for (var i = 0; i < app.pageOptions.groups.length; i++) {
                if (app.pageOptions.groups[i].id == this.group_id) {
                  var the_group = app.pageOptions.groups[i];
                }
            }
            if (app.pageOptions.is_staff) {
                group_links += '<a class="op-link sf2-icon-cog1"' + 'href="" title=' + '"' + gettext("Admin") + '"</a>';
            }
            if (the_group.view_perm != 'pub') {
                group_links += '<a class="op-link sf2-icon-user2"' + 'href="" title=' + '"' + gettext("Members") + '"</a>';
            }
            if (!the_group.is_pub) {
                group_links += '<a class="op-link sf2-icon-msgs2"' + 'href="" title=' + '"' + gettext("Discussion") + '"</a>';
            }
            this.$group_links.html(group_links);
        },

        renderPath: function() {
            var group_name = '';
            for (var i = 0; i < app.pageOptions.groups.length; i++) {
                if (app.pageOptions.groups[i].id == this.group_id) {
                    group_name = app.pageOptions.groups[i].name;
                }
            }
            var path_link = '<a class="normal" href="/groups/">' + gettext("Groups") + '</a> / ' + group_name + ' /';
            this.$path_bar.html(path_link);
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            this.renderPath();
            this.renderGroupLinks();
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

        showRepoList: function(group_id) {
            this.group_id = group_id;
            this.dirView.hide();
            this.$emptyTip.hide();
            this.$el.show();
            this.$table.hide();
            var $loadingTip = this.$loadingTip;
            $loadingTip.show();
            var _this = this;
            this.repos.setGroupID(group_id);
            this.repos.fetch({
                cache: false,
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
            this.$el.hide();
        },

        showDir: function(group_id, repo_id, path) {
            this.group_id = group_id;
            this.hideRepoList();
            this.dirView.showDir('group/' + this.group_id, repo_id, path);
        },

        createRepo: function() {
            new AddGroupRepoView(this.repos);
        },

        sortByName: function() {
            this.$('.by-time .sort-icon').hide();
            var repos = this.repos;
            var el = this.$('.by-name .sort-icon');
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
            this.$('.by-name .sort-icon').hide();
            var repos = this.repos;
            var el = this.$('.by-time .sort-icon');
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
            this.dirView.hide();
            this.$emptyTip.hide();
        }

    });

    return GroupView;
});

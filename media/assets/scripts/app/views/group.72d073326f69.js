define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'app/views/group-repo',
    'app/views/add-group-repo',
    'app/views/group-members',
    'app/views/group-settings'
], function($, _, Backbone, Common, GroupRepos, GroupRepoView,
    AddGroupRepoView, GroupMembersView, GroupSettingsView) {
    'use strict';

    var GroupView = Backbone.View.extend({
        el: '#group',

        groupTopTemplate: _.template($('#group-top-tmpl').html()),
        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),

        events: {
            'click #group-settings-icon': 'toggleSettingsPanel',
            'click #group-members-icon': 'toggleMembersPanel',
            'click #group-wiki-icon': 'showGroupWiki',
            'click .repo-create': 'createRepo',
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.$tabs = this.$el;
            this.$table = this.$('table');
            this.$tableHead = this.$('thead');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('#group-repos .loading-tip');
            this.$emptyTip = this.$('#group-repos .empty-tips');

            this.group = {}; // will be fetched when rendering the top bar

            this.repos = new GroupRepos();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.dirView = options.dirView;

            this.membersView = new GroupMembersView();
            this.settingsView = new GroupSettingsView({
                groupView: this
            });
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

        renderGroupTop: function() {
            var _this = this;
            var $groupTop = $('#group-top');
            $.ajax({
                url: Common.getUrl({
                    'name': 'group',
                    'group_id': this.group_id
                }),
                cache: false,
                dataType: 'json',
                success: function (data) {
                    _this.group = data;
                    $groupTop.html(_this.groupTopTemplate(data));
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error_msg;
                    } else {
                        err_msg = gettext("Please check the network.");
                    }
                    $groupTop.html('<p class="error">' + err_msg + '</p>');
                }
            });
        },

        showRepoList: function(group_id) {
            this.group_id = group_id;
            this.dirView.hide();
            this.$emptyTip.hide();
            this.renderGroupTop();
            this.$tabs.show();
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
            this.$tabs.hide();
        },

        showDir: function(group_id, repo_id, path) {
            this.group_id = group_id;
            this.hideRepoList();

            var group_name = Common.groupId2Name(group_id);
            if (group_name) {
                this.dirView.showDir('group/' + this.group_id, repo_id, path, {'group_name': group_name});
            } else {
                // the group does not exist
                Common.feedback('Group {group_id} not found'.replace('{group_id}', group_id), 'error');
                app.router.navigate('my-libs/', {trigger: true});
            }
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
        },

        showSettings: function() {
            this.settingsView.show({
                'group': this.group
            });
        },

        toggleSettingsPanel: function() {
            var panel_id = this.settingsView.el.id;
            if ($('#' + panel_id + ':visible').length) { // the panel is shown
                this.settingsView.hide();
            } else {
                this.showSettings();
            }
        },

        showGroupWiki: function() {
            location.href = '/group/' + this.group.id + '/wiki/';
        },

        showMembers: function() {
            this.membersView.show({'group_id': this.group_id});
        },

        toggleMembersPanel: function() {
            var panel_id = this.membersView.el.id;
            if ($('#' + panel_id + ':visible').length) { // the panel is shown
                this.membersView.hide();
            } else {
                this.showMembers();
            }
        }

    });

    return GroupView;
});

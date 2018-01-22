define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'app/views/group-repo',
    'app/views/add-group-repo',
    'app/views/group-members',
    'app/views/group-discussions',
    'app/views/group-settings'
], function($, _, Backbone, Common, GroupRepos, GroupRepoView,
    AddGroupRepoView, GroupMembersView, GroupDiscussionsView, GroupSettingsView) {
    'use strict';

    var GroupView = Backbone.View.extend({
        id: 'group',

        template: _.template($('#group-tmpl').html()),
        groupTopTemplate: _.template($('#group-top-tmpl').html()),
        reposHdTemplate: _.template($('#shared-repos-hd-tmpl').html()),
        mobileReposHdTemplate: _.template($('#shared-repos-hd-mobile-tmpl').html()),

        events: {
            'click #group-settings-icon': 'toggleSettingsPanel',
            'click #group-members-icon': 'toggleMembersPanel',
            'click #group-discussions-icon': 'toggleDiscussionsPanel',
            'click .repo-create': 'createRepo',
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.group = {}; // will be fetched when rendering the top bar

            this.repos = new GroupRepos();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.settingsView = new GroupSettingsView({ groupView: this });
            this.membersView = new GroupMembersView({ groupView: this });
            this.discussionsView = new GroupDiscussionsView({ groupView: this });
            this.render();
        },

        addOne: function(repo, collection, options) {
            var view = new GroupRepoView({
                model: repo,
                group_id: this.group_id,
                show_repo_owner: true,
                is_staff: this.repos.is_staff
            });
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
                this.$emptyTip.show();
                this.$table.hide();
            }

        },

        renderGroupTop: function(options) {
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
                    if (options) {
                        if (options.showDiscussions) {
                            _this.showDiscussions();
                        }
                    }
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

        showRepoList: function(group_id, options) {
            this.group_id = group_id;
            this.$emptyTip.hide();
            this.renderGroupTop(options);
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

        render: function() {
            this.$el.html(this.template());
            this.$table = this.$('table');
            this.$tableHead = this.$('thead');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('#group-repos .loading-tip');
            this.$emptyTip = this.$('#group-repos .empty-tips');
            this.attached = false;
        },

        show: function(group_id, options) {
            if (!this.attached) {
                // if the user swith bettern different groups,
                // the group view is already attached.
                $("#right-panel").html(this.$el);
                this.attached = true;
            }
            this.showRepoList(group_id, options);
        },

        hide: function() {
            this.attached = false;
            this.$el.detach();
        },

        createRepo: function() {
            new AddGroupRepoView(this.repos);
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
        },

        toggleSettingsPanel: function() {
            return this.settingsView.toggle();
        },

        toggleMembersPanel: function() {
            return this.membersView.toggle();
        },

        showDiscussions: function() {
            return this.discussionsView.show();
        },

        toggleDiscussionsPanel: function() {
            return this.discussionsView.toggle();
        }

    });

    return GroupView;
});

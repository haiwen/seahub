define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'app/collections/group-owned-repos', // for address book group
    'app/views/group-repo',
    'app/views/add-group-repo',
    'app/views/add-department-repo',
    'app/views/repo-details',
    'app/views/group-members',
    'app/views/group-discussions',
    'app/views/group-settings'
], function($, _, Backbone, Common, GroupRepos, GroupOwnedRepos, GroupRepoView,
    AddGroupRepoView, AddDepartmentRepoView, RepoDetailsView,
    GroupMembersView, GroupDiscussionsView, GroupSettingsView) {
    'use strict';

    var GroupView = Backbone.View.extend({
        el: '.main-panel',

        template: _.template($('#group-tmpl').html()),
        toolbarTemplate: _.template($('#group-toolbar-tmpl').html()),
        toolbar2Template: _.template($('#group-toolbar2-tmpl').html()),
        pathTemplate: _.template($('#group-path-tmpl').html()),
        theadTemplate: _.template($('#shared-repos-hd-tmpl').html()),
        theadMobileTemplate: _.template($('#shared-repos-hd-mobile-tmpl').html()),

        events: {
            'click #group-settings-icon': 'toggleSettingsPanel',
            'click #group-members-icon': 'toggleMembersPanel',
            'click #group-discussions-icon': 'toggleDiscussionsPanel',
            'click #group-toolbar .repo-create': 'createRepo',
            'click #group-repos .by-name': 'sortByName',
            'click #group-repos .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.group = {}; // will be fetched when rendering the top bar

            this.repos = new GroupRepos();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            this.ownedRepos = new GroupOwnedRepos();
            this.listenTo(this.ownedRepos, 'add', this.addOne);
            // for adding the first owned repo when there is no repos in the group.
            this.listenTo(this.ownedRepos, 'reset', this.resetOwnedRepos);

            this.settingsView = new GroupSettingsView({groupView: this});
            this.membersView = new GroupMembersView({groupView: this});
            this.discussionsView = new GroupDiscussionsView({groupView: this});

            this.repoDetailsView = new RepoDetailsView({'parentView': this});
        },

        addOne: function(repo, collection, options) {

            // for newly created group owned repo, returned by 'POST' request
            if (!repo.get('size_formatted') && repo.get('size') == 0
                && !repo.get('mtime_relative')) {
                repo.set({
                    'size_formatted': '0 bytes', // no trans here
                    'mtime_relative': gettext("Just now")
                });
            }

            var view = new GroupRepoView({
                model: repo,
                group_id: this.group_id,
                show_repo_owner: true,
                repoDetailsView: this.repoDetailsView,
                is_staff: this.repos.is_staff
            });

            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        renderThead: function() {
            var tmpl;
            if ($(window).width() < 768) {
                tmpl = this.theadMobileTemplate;
            } else {
                tmpl = this.theadTemplate;
            }
            this.$tableHead.html(tmpl());
        },

        reset: function(options) {
            var repos = options.repos || this.repos;
            if (repos.length) {
                this.$emptyTip.hide();
                this.renderThead();
                this.$tableBody.empty();

                // sort
                Common.updateSortIconByMode({'context': this.$el});
                Common.sortLibs({'libs': repos});

                repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.showEmptyTip();
                this.$table.hide();
            }
        },

        resetOwnedRepos: function() {
            // no repos in the group
            if (this.repos.length == 0) {
                this.reset({repos: this.ownedRepos});
            }
        },

        showEmptyTip: function() {
            if (this.group.is_address_book_group) {
                if (this.group.user_is_admin) {
                    this.$emptyTip.filter('.address-book-group-empty-tips-for-admin').show();
                } else {
                    this.$emptyTip.filter('.address-book-group-empty-tips-for-member').show();
                }
            } else {
                this.$emptyTip.filter('.common-group-empty-tips').show();
            }
        },

        showGroup: function(options) {
            var _this = this;

            this.$table.hide();
            this.$emptyTip.hide();
            this.$error.hide();
            this.$loadingTip.show();

            $.ajax({
                url: Common.getUrl({
                    'name': 'group',
                    'group_id': this.group_id
                }),
                cache: false,
                dataType: 'json',
                success: function(data) {
                    _this.group = data;

                    var user_can_add_repo = false;
                    var user_is_admin = false;
                    if ($.inArray(app.pageOptions.username, data.admins) != -1) {
                        user_is_admin = true;
                    }
                    _this.group.is_address_book_group = false;
                    _this.group.user_is_admin = user_is_admin;
                    if (data.parent_group_id == 0) { // common group
                        user_can_add_repo = true;
                        _this.group.repos_for_new = _this.repos; // for creating a new library
                    } else { // address book group
                        _this.group.is_address_book_group = true;
                        if (app.pageOptions.is_pro && user_is_admin) {
                            user_can_add_repo = true;
                            _this.group.repos_for_new = _this.ownedRepos; // for creating a new library
                        }
                    }
                    if (user_can_add_repo) {
                        _this.$toolbar.removeClass('hide'); // show 'New Library' button
                    } else {
                        _this.$toolbar.addClass('hide');
                    }

                    _this.renderPath({
                        'name': data.name,
                        'is_address_book_group': _this.group.is_address_book_group
                    });
                    _this.renderToolbar2({
                        'id': data.id,
                        'wiki_enabled': data.wiki_enabled
                    });
                    // for common member in a group, there is only 'leave group' option in the 'settings' popup
                    // in an address book group, a common member can't 'leave group'
                    if (data.parent_group_id != 0 && !user_is_admin) {
                        $('#group-settings-icon').hide();
                    }
                    _this.showRepoList();
                    if (options) {
                        if (options.showDiscussions) {
                            _this.showDiscussions();
                        }
                    }
                },
                error: function(xhr) {
                    var err_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$toolbar.addClass('hide');
                    _this.$path.empty();
                    _this.$toolbar2.empty();
                    _this.$loadingTip.hide();
                    _this.$error.html(err_msg).show();
                }
            });
        },

        showRepoList: function() {
            var _this = this;
            this.repos.setGroupID(this.group_id);
            this.repos.fetch({
                cache: false,
                reset: true,
                data: {from: 'web'},
                success: function(collection, response, opts) {
                },
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$error.html(err_msg).show();
                },
                complete: function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        renderToolbar: function() {
            this.$toolbar = $('<div class="cur-view-toolbar hide" id="group-toolbar"></div>')
                .html(this.toolbarTemplate());
            this.$('.common-toolbar').before(this.$toolbar);
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main main-panel-main-with-side" id="group"></div>')
                .html(this.template());
            this.$el.append(this.$mainCon);

            this.$path = $('.group-path', this.$mainCon);
            this.$toolbar2 = $('.group-toolbar-2', this.$mainCon);
            this.$table = $('table', this.$mainCon);
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('.loading-tip', this.$mainCon);
            this.$emptyTip = this.$('#group-repos .empty-tips');
            this.$error = $('.error', this.$mainCon);
        },

        renderPath: function(data) {
            this.$path.html(this.pathTemplate(data));
        },

        renderToolbar2: function(data) {
            this.$toolbar2.html(this.toolbar2Template(data));
        },

        // update group name. e.g 'rename'
        updateName: function(new_name) {
            this.group.name = new_name;
            $('.group-name', this.$mainCon).html(Common.HTMLescape(new_name));
        },

        show: function(group_id, options) {
            if (!$('#group').length) {
                this.renderToolbar();
                this.renderMainCon();
            }
            // when switch from a group to another group
            if (this.repoDetailsView.$el.is(':visible')) {
                this.repoDetailsView.hide();
            }

            this.group_id = group_id;
            this.showGroup(options);
        },

        hide: function() {
            this.$toolbar.detach();
            this.$mainCon.detach();
        },

        createRepo: function() {
            var repos = this.group.repos_for_new;
            repos.setGroupID(this.group_id);
            if (this.group.is_address_book_group) {
                new AddDepartmentRepoView(repos);
            } else {
                new AddGroupRepoView(repos);
            }
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

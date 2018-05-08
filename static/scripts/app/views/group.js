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

            this.settingsView = new GroupSettingsView({groupView: this});
            this.membersView = new GroupMembersView({groupView: this});
            this.discussionsView = new GroupDiscussionsView({groupView: this});
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

        renderThead: function() {
            var tmpl = $(window).width() >= 768 ? this.theadTemplate : this.theadMobileTemplate;
            this.$tableHead.html(tmpl());
        },

        reset: function() {
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.renderThead();
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
                    _this.$toolbar.removeClass('hide');
                    _this.renderPath({
                        'name': data.name
                    });
                    _this.renderToolbar2({
                        'id': data.id,
                        'wiki_enabled': data.wiki_enabled
                    });
                    _this.showRepoList();
                    if (options) {
                        if (options.showDiscussions) {
                            _this.showDiscussions();
                        }
                    }
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = JSON.parse(xhr.responseText).error_msg;
                    } else {
                        err_msg = gettext("Please check the network.");
                    }
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
                    _this.$error.html(err_msg).show();
                },
                complete: function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        renderToolbar: function() {
            this.$toolbar = $('<div class="cur-view-toolbar hide" id="group-toolbar"></div>').html(this.toolbarTemplate());
            this.$('.common-toolbar').before(this.$toolbar);
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main main-panel-main-with-side" id="group"></div>').html(this.template());
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
            this.group_id = group_id;
            this.showGroup(options);
        },

        hide: function() {
            this.$toolbar.detach();
            this.$mainCon.detach();
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

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/all-groups-repo',
    'app/collections/all-groups-repos',
], function($, _, Backbone, Common, AllGroupsRepoView,
    AllGroupsReposCollection) {
    'use strict';

    var AllGroupsReposView = Backbone.View.extend({
        el: '#all-groups',

        groupsTemplate: _.template($('#all-groups-tmpl').html()),
        createGroupTemplate: _.template($('#create-group-tmpl').html()),

        initialize: function(options) {
            this.$sideTips = $('#all-groups-side-tips');

            this.$loadingTip = $('#all-groups .loading-tip');
            this.$errorTip = $('#all-groups .error');
            this.$emptyTip = $('#all-groups .empty-tips');

            this.$reposDiv = $('#all-groups');
            this.$reposTables = $('#all-groups-tables');

            this.allGroups = new AllGroupsReposCollection();
            this.dirView = options.dirView;
        },

        events: {
            'click #create-group-btn': 'createGroup'
        },

        createGroup: function() {
            var createGroupForm = $(this.createGroupTemplate());
            var submit_btn = $('.submit', createGroupForm);
            createGroupForm.modal({appendTo: "#main"});
            $("#simplemodal-container").css({'height':'auto'});

            var _this = this;
            createGroupForm.submit(function() {
                Common.disableButton(submit_btn);
                var group_name = $('[name="group_name"]', _this.createGroupForm).val();
                if (!group_name) {
                    $('.error', createGroupForm).html(gettext("Please enter group name")).show();
                    Common.enableButton(submit_btn);
                    return false;
                }

                $.ajax({
                    url: Common.getUrl({name: 'groups'}),
                    type: 'PUT',
                    dataType: 'json',
                    cache: 'false',
                    beforeSend: Common.prepareCSRFToken,
                    data: {'group_name': group_name},
                    success: function(data) {
                        var $group_info = $(_this.groupsTemplate({'group_name': group_name, 'group_id': data['group_id']}));
                        $group_info.find('tbody').append('<tr><td colspan=6 class="no-repos">' + gettext('No library is shared to this group') + '</td></tr>');
                        _this.$reposTables.prepend($group_info);
                        $.modal.close();
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        var error;
                        if (jqXHR.responseText) {
                            error = $.parseJSON(jqXHR.responseText).error;
                        } else {
                            error =  gettext("Failed. Please check the network.");
                        }
                        $('.error', createGroupForm).html(gettext(error)).show();
                        Common.enableButton(submit_btn);
                    }
                });
                return false;
            });
        },

        render: function () {
            var repoView;

            for (var index in this.allGroups.models) {
                var group = this.allGroups.models[index],
                    group_repos = group.get('repos'),
                    group_id = group.get('group_id'),
                    group_name = group.get('group_name'),
                    $group_info = $(this.groupsTemplate({'group_name': group_name, 'group_id': group_id}));

                this.$reposTables.append($group_info);

                group_repos.sort(function (a, b) {
                    return Common.compareTwoWord(a['repo_name'], b['repo_name']);
                });

                if (group_repos.length) {
                    _.each(group_repos, function(repo) {
                        repoView = new AllGroupsRepoView({'repo': repo, 'group_id': group_id});
                        $group_info.find('tbody').append(repoView.render().el);
                    });
                } else {
                    $group_info.find('tbody').append('<tr><td colspan=6 class="no-repos">' + gettext('No library is shared to this group') + '</td></tr>');
                }

            }
        },

        showSideTips: function() {
            this.$sideTips.show();
        },

        showAllGroups: function() {
            var _this = this;

            this.showSideTips();
            this.$reposTables.empty();
            this.$el.show();
            this.$loadingTip.show();
            this.dirView.hide();

            this.allGroups.fetch({
                cache: false,
                reset: true,
                success: function(data) {
                    _this.$loadingTip.hide();
                    if (data.length > 0) {
                        _this.$reposTables.empty().show();
                        _this.render();
                        _this.$emptyTip.hide();
                    } else {
                        _this.$emptyTip.show();
                    }
                },
                error: function (collection, response, opts) {
                    _this.$loadingTip.hide();
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
                    _this.$errorTip.html(err_msg).show();
                }
            });
        },

        hide: function() {
            this.$sideTips.hide();
            this.$el.hide();
            this.dirView.hide();
        }

    });

    return AllGroupsReposView;
});

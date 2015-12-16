define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'app/views/group-repo'
], function($, _, Backbone, Common, GroupRepos, GroupRepoView) {
    'use strict';

    var GroupItemView = Backbone.View.extend({
        tagName: 'tbody',

        groupHeaderTemplate: _.template($('#all-groups-header-tmpl').html()),
        noGroupReposTemplate: _.template($('#all-groups-no-repos-tmpl').html()),

        events: {
        },

        initialize: function() {
        },

        render: function() {
            this.$el.append(this.groupHeaderTemplate(this.model.attributes));
            var repos = this.model.get('repos');
            if (repos.length) {
                this.renderRepoList(repos);
            } else {
                this.$el.append(this.noGroupReposTemplate());
            }
            return this;
        },

        renderRepoList: function (repos) {
            repos.sort(function(a, b) {
                return Common.compareTwoWord(a.name, b.name);
            });
            var group_id = this.model.get('id'),
                is_staff = $.inArray(app.pageOptions.username, this.model.get('admins')) != -1 ? true : false,
                $listContainer = this.$el;
            var groupRepos = new GroupRepos();
            groupRepos.setGroupID(group_id);
            $(repos).each(function(index, item) {
                var view = new GroupRepoView({
                    model: new Backbone.Model(item, {collection: groupRepos}), 
                    group_id: group_id,
                    is_staff: is_staff
                }); 
                $listContainer.append(view.render().el);
            });
        }

    });

    return GroupItemView;
});

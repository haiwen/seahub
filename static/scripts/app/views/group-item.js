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
        template: _.template($('#group-item-tmpl').html()),

        events: {
        },

        initialize: function() {
        },

        render: function() {
            this.$el.html(this.template(this.model.attributes));
            var repos = this.model.get('repos');
            if (repos.length) {
                this.renderRepoList(repos);
            }
            return this;
        },

        renderRepoList: function (repos) {
            repos.sort(function(a, b) {
                return Common.compareTwoWord(a.name, b.name);
            });
            var group_id = this.model.get('id'),
                is_staff = $.inArray(app.pageOptions.username, this.model.get('admins')) != -1 ? true : false,
                $listContainer = this.$('tbody');
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

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'app/views/group-repo',
    'app/models/group-repo'
], function($, _, Backbone, Common, GroupRepos, GroupRepoView, GroupRepo) {
    'use strict';

    var GroupItemView = Backbone.View.extend({
        template: _.template($('#group-item-tmpl').html()),
        mobileTemplate: _.template($('#group-item-mobile-tmpl').html()),

        events: {
        },

        initialize: function(options) {
            this.repoDetailsView = options.repoDetailsView;
        },

        render: function() {
            var tmpl = $(window).width() >= 768 ? this.template : this.mobileTemplate;
            this.$el.html(tmpl(this.model.attributes));
            var repos = this.model.get('repos');
            if (repos.length) {
                this.renderRepoList(repos);
            }
            return this;
        },

        renderRepoList: function(repos) {
            repos.sort(function(a, b) {
                return Common.compareTwoWord(a.name, b.name);
            });
            var group_id = this.model.get('id'),
                is_staff = $.inArray(app.pageOptions.username, this.model.get('admins')) != -1 ? true : false,
                repoDetailsView = this.repoDetailsView,
                $listContainer = this.$('tbody');
            var groupRepos = new GroupRepos();
            groupRepos.setGroupID(group_id);
            $(repos).each(function(index, item) {
                var view = new GroupRepoView({
                    model: new GroupRepo(item, {collection: groupRepos}),
                    group_id: group_id,
                    is_staff: is_staff,
                    repoDetailsView: repoDetailsView,
                    show_repo_owner: false // don't show 'Owner'
                });
                $listContainer.append(view.render().el);
            });
        }

    });

    return GroupItemView;
});

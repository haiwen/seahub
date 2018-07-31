define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/group-repo',
    'sysadmin-app/collection/group-repos'
], function($, _, Backbone, Common, GroupRepoView, GroupRepoCollection) {

    'use strict';

    var GroupReposView = Backbone.View.extend({

        id: 'admin-groups',

        tabNavTemplate: _.template($("#groups-tabnav-tmpl").html()),
        template: _.template($("#group-libraries-tmpl").html()),

        initialize: function() {
            this.groupRepoCollection = new GroupRepoCollection();
            this.listenTo(this.groupRepoCollection, 'add', this.addOne);
            this.listenTo(this.groupRepoCollection, 'reset', this.reset);
        },

        render: function() {
            var group_id = this.groupRepoCollection.group_id;
            this.$el.html(this.tabNavTemplate({'cur_tab': 'libs', 'group_id': group_id}) + this.template());

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function(group_id) {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }

            // init collection
            this.groupRepoCollection.setGroupId(group_id);
            this.render();
            this.showGroupLibraries();
        },

        showGroupLibraries: function() {
            this.initPage();
            var _this = this;

            this.groupRepoCollection.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        reset: function() {
            this.$loadingTip.hide();
            if (this.groupRepoCollection.length > 0) {
                this.groupRepoCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }

            this.$('.path-bar').append(this.groupRepoCollection.group_name);
        },

        addOne: function(library) {
            var view = new GroupRepoView({model: library});
            this.$tableBody.append(view.render().el);
        }
    });

    return GroupReposView;

});

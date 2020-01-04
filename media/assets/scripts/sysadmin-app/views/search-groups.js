define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/group',
    'sysadmin-app/collection/search-groups'
], function($, _, Backbone, Common, GroupView, GroupCollection) {
    'use strict';

    var GroupsView = Backbone.View.extend({

        id: 'search-groups',

        template: _.template($("#search-groups-tmpl").html()),

        initialize: function() {
            this.groupCollection = new GroupCollection();
            this.listenTo(this.groupCollection, 'add', this.addOne);
            this.listenTo(this.groupCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.append(this.template());

            this.$form = this.$('#search-group-form');
            this.$name = $('[name="name"]', this.$form);

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        events: {
            'submit #search-group-form': 'formSubmit'
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

        show: function(option) {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.getContent(option);
        },

        getContent: function(obj) {
            this.initPage();
            var _this = this;
            this.groupCollection.fetch({
                data: obj,
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                },
                complete:function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        reset: function() {
            var name = this.groupCollection.search_name;
            app.router.navigate('#search-groups/?name=' + encodeURIComponent(name));
            this.$name.val(name);

            this.$loadingTip.hide();
            if (this.groupCollection.length > 0) {
                this.groupCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        },

        addOne: function(group) {
            var view = new GroupView({model: group});
            this.$tableBody.append(view.render().el);
        },

        formSubmit: function() {
            var name = $.trim(this.$name.val());

            if (!name) {
                return false;
            }

            this.getContent({'name': name});
            return false;
        }
    });

    return GroupsView;

});

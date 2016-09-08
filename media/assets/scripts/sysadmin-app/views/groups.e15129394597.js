define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/group',
    'sysadmin-app/collection/groups'
], function($, _, Backbone, Common, GroupView, GroupCollection) {
    'use strict';

    var GroupsView = Backbone.View.extend({

        id: 'admin-groups',

        template: _.template($("#groups-tmpl").html()),

        initialize: function() {
            this.groupCollection = new GroupCollection();
            this.listenTo(this.groupCollection, 'add', this.addOne);
            this.listenTo(this.groupCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.append(this.template());

            this.$exportExcel = this.$('.js-export-excel');
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$jsPrevious = this.$('.js-previous');
            this.$jsNext = this.$('.js-next');
            this.$error = this.$('.error');
        },

        events: {
            'click #paginator .js-next': 'getNextPage',
            'click #paginator .js-previous': 'getPreviousPage'
        },

        initPage: function() {
            this.$loadingTip.show();
            this.$exportExcel.hide();
            this.$table.hide();
            this.$tableBody.empty();
            this.$jsNext.hide();
            this.$jsPrevious.hide();
            this.$emptyTip.hide();
            this.$error.hide();
        },

        getNextPage: function() {
            this.initPage();
            var current_page = this.groupCollection.state.current_page;
            if (this.groupCollection.state.has_next_page) {
                this.groupCollection.getPage(current_page + 1, {
                    reset: true
                });
            }

            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            var current_page = this.groupCollection.state.current_page;
            if (current_page > 1) {
                this.groupCollection.getPage(current_page - 1, {
                    reset: true
                });
            }
            return false;
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function(option) {
            this.option = option;
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.getContent();
        },

        getContent: function() {
            this.initPage();
            var _this = this;
            this.groupCollection.fetch({
                data: {'page': this.option.page},
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = $.parseJSON(response.responseText).error_msg;
                        }
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    _this.$error.html(err_msg).show();
                },
                complete:function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        reset: function() {
            // update the url
            var current_page = this.groupCollection.state.current_page;
            app.router.navigate('groups/?page=' + current_page);

            this.$loadingTip.hide();
            if (this.groupCollection.length > 0) {
                this.$exportExcel.show();
                this.groupCollection.each(this.addOne, this);
                this.$table.show();
                this.renderPaginator();
            } else {
                this.$emptyTip.show();
            }
        },

        renderPaginator: function() {
            if (this.groupCollection.state.has_next_page) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            var current_page = this.groupCollection.state.current_page;
            if (current_page > 1) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        },

        addOne: function(group) {
            var view = new GroupView({model: group});
            this.$tableBody.append(view.render().el);
        }
    });

    return GroupsView;

});

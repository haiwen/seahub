define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'sysadmin-app/views/device',
    'sysadmin-app/collection/devices'
], function($, _, Backbone, Common, Moment, Device, DeviceCollection) {
    'use strict';

    var DevicesView = Backbone.View.extend({

        id: 'admin-devices',

        template: _.template($("#devices-tmpl").html()),

        initialize: function() {
            this.deviceCollection = new DeviceCollection();
            this.listenTo(this.deviceCollection, 'add', this.addOne);
            this.listenTo(this.deviceCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.html(this.template({'cur_tab': 'mobile', 'is_pro': app.pageOptions.is_pro}));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$jsPrevious = this.$('.js-previous');
            this.$jsNext = this.$('.js-next');
        },

        events: {
            'click #paginator .js-next': 'getNextPage',
            'click #paginator .js-previous': 'getPreviousPage'
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$jsNext.hide();
            this.$jsPrevious.hide();
        },

        getNextPage: function() {
            this.initPage();
            var current_page = this.deviceCollection.state.current_page;
            if (this.deviceCollection.state.has_next_page) {
                this.deviceCollection.getPage(current_page + 1, {
                    reset: true,
                    data: {'platform': 'mobile'}
                });
            }

            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            var current_page = this.deviceCollection.state.current_page;
            if (current_page > 1) {
                this.deviceCollection.getPage(current_page - 1, {
                    reset: true,
                    data: {'platform': 'mobile'}
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
            this.showMobileDevices();
        },

        showMobileDevices: function() {
            this.initPage();
            var _this = this,
                current_page = this.option.current_page || 1;

            this.deviceCollection.fetch({
                data: {'platform': 'mobile', 'page': current_page},
                cache: false, // for IE
                reset: true,
                error: function (collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        reset: function() {
            var length = this.deviceCollection.length,
                current_page = this.deviceCollection.state.current_page;

            this.$loadingTip.hide();

            if (length > 0) {
                this.deviceCollection.each(this.addOne, this);
                this.$table.show();
                this.renderPaginator();
            } else {
                this.$emptyTip.show();
            }

            app.router.navigate('mobile-devices/?page=' + current_page);
        },

        addOne: function(device) {
            var view = new Device({model: device});
            this.$tableBody.append(view.render().el);
        },

        renderPaginator: function() {
            if (this.deviceCollection.state.has_next_page) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            var current_page = this.deviceCollection.state.current_page;
            if (current_page > 1) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        }

    });

    return DevicesView;

});

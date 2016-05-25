define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/system-library'
], function($, _, Backbone, Common, SystemLibrary) {
    'use strict';

    var SystemLibraryView = Backbone.View.extend({

        id: "admin-system-library",

        template: _.template($("#system-library-tmpl").html()),
        itemTemplate: _.template($("#system-library-item-tmpl").html()),

        initialize: function() {
            this.systemLibrary = new SystemLibrary();
            this.render();
        },

        render: function() {
            var data = {'cur_tab': 'system',};
            this.$el.html(this.template(data));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
        },

        showSystemLibrary: function() {
            this.initPage();
            var _this = this;

            this.systemLibrary.fetch({
                url: Common.getUrl({name: 'admin-system-library'}),
                cache: false, // for IE
                reset: true,
                success: function(model, response, options) {
                    _this.reset();
                },
                error: function(model, response, options) {
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
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        hide: function() {
            this.$el.detach();
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.showSystemLibrary();
        },

        reset: function() {
            this.$loadingTip.hide();
            this.$tableBody.html(this.itemTemplate(this.systemLibrary.toJSON()));
            this.$table.show();
        }

    });

    return SystemLibraryView;
});

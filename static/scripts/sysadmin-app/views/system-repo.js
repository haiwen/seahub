define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/system-repo'
], function($, _, Backbone, Common, SystemRepo) {
    'use strict';

    var SystemRepoView = Backbone.View.extend({

        id: "system-library",

        tabNavTemplate: _.template($("#libraries-tabnav-tmpl").html()),
        template: _.template($("#system-library-tmpl").html()),
        itemTemplate: _.template($("#system-library-item-tmpl").html()),

        initialize: function() {
            this.systemRepo = new SystemRepo();
            this.render();
        },

        render: function() {
            var $tabnav = $(this.tabNavTemplate({'cur_tab': 'system'}));
            this.$el.append($tabnav);
            this.$el.append(this.template());

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

            this.systemRepo.fetch({
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
            this.$tableBody.html(this.itemTemplate(this.systemRepo.toJSON()));
            this.$table.show();
        }

    });

    return SystemRepoView;
});

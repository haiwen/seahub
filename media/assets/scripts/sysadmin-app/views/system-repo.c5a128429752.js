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
            this.$error = this.$('.error');
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$error.hide();
            this.$loadingTip.show();
        },

        showSystemLibrary: function() {
            this.initPage();
            var _this = this;

            this.systemRepo.fetch({
                url: Common.getUrl({name: 'admin-system-library'}),
                cache: false,
                success: function(model, response, options) {
                    _this.reset();
                },
                error: function(model, response, options) {
                    _this.$error.html(gettext("Error")).show();
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
            this.$error.hide();
            this.$tableBody.html(this.itemTemplate(this.systemRepo.toJSON()));
            this.$table.show();
        }

    });

    return SystemRepoView;
});

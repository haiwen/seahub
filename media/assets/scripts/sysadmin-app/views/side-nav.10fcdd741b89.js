define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var sideNavView = Backbone.View.extend({
        el: '#side-nav',

        template: _.template($("#side-nav-tmpl").html()),

        initialize: function() {
            this.default_cur_tab = 'dashboard';
            this.data = {
                'cur_tab': this.default_cur_tab
            };
            this.render();
            this.$el.show();
        },

        render: function() {
            this.$el.html(this.template(this.data));
            return this;
        },

        setCurTab: function(cur_tab, options) {
            this.data.cur_tab = cur_tab || this.default_cur_tab;
            if (options) {
                $.extend(this.data, options);
            }
            this.render();
        }

    });

    return sideNavView;
});

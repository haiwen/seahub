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
        },

        events: {
            'submit #libs-search-form': 'searchLibs', // for 'all' libs
            'submit #trash-libs-search-form': 'searchTrashLibs'
        },

        // search libs by repo_name
        searchLibs: function() {
            var $form = this.$('#libs-search-form');
            var name = $.trim($('[name="name"]', $form).val()); 
            if (!name) {
                return false;
            }

            var url = $form.attr('action') + '?name=' + encodeURIComponent(name) + '&owner=';
            location.href = url;
            return false; // necessary
        },

        // search trash libs by owner
        searchTrashLibs: function() {
            var $form = this.$('#trash-libs-search-form');
            var owner = $.trim($('[name="name"]', $form).val()); 
            if (!owner) {
                return false;
            }

            var url = $form.attr('action') + '?name=' + encodeURIComponent(owner);
            location.href = url;
            return false; // necessary
        }

    });

    return sideNavView;
});

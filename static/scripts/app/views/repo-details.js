define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        id: 'repo-details',
        className: 'details-panel right-side-panel hide', // `hide` is for 'clickItem' in `views/myhome-repos.js`

        template:  _.template($('#repo-details-tmpl').html()),

        initialize: function() {
            $("#main").append(this.$el);

            var _this = this;
            $(document).keydown(function(e) {
                // ESCAPE key pressed
                if (e.which == 27) {
                    _this.hide();
                }
            });

            $(window).resize(function() {
                _this.setConMaxHeight();
            });
        },

        events: {
            'click .js-close': 'close'
        },

        render: function() {
            this.$el.html(this.template(this.data));
        },

        setConMaxHeight: function() {
            this.$('.right-side-panel-con').css({
                'height': $(window).height() -  // this.$el `position:fixed; top:0;`
                    this.$('.right-side-panel-hd').outerHeight(true)
            });
        },

        hide: function() {
            this.$el.css({'right': '-400px'}).hide();
        },

        close: function() {
            this.hide();
            return false;
        },

        show: function(options) {
            this.data = options;
            this.render();
            this.$el.css({'right': '0px'}).show();
            this.setConMaxHeight();
        }

    });

    return View;
});

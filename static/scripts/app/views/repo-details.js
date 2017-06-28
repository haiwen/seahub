define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        id: 'repo-details',
        className: 'details-panel right-side-panel',

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

        update: function(part_data) {
            if (part_data.error) {
                this.$('#file-count').html('<span class="error">' + gettext("Error") + '</span>');
            } else {
                this.$('#file-count').html(part_data.file_count);
            }
        },

        setConMaxHeight: function() {
            this.$('.right-side-panel-con').css({
                'height': $(window).height() -  // this.$el `position:fixed; top:0;`
                    this.$('.right-side-panel-hd').outerHeight(true)
            });
        },

        hide: function() {
            this.$el.css({'right': '-320px'});
        },

        close: function() {
            this.hide();
            return false;
        },

        show: function(options) {
            this.data = options;
            this.render();
            this.$el.css({'right': '0px'});
            this.setConMaxHeight();
        }

    });

    return View;
});

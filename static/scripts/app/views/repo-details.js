define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        id: 'repo-details',
        className: 'details-panel',

        template:  _.template($('#repo-details-tmpl').html()),

        initialize: function(options) {
            var _this = this;

            this.parentView = options.parentView;
            $(document).on('keydown', function(e) {
                // ESCAPE key pressed
                if (e.which == 27) {
                    _this.hide();
                }
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

        hide: function() {
            this.$el.hide();
        },

        close: function() {
            this.hide();
            return false;
        },

        show: function(options) {
            this.data = options;
            this.render();

            if (!$('#' + this.id).length) {
                this.parentView.$('.main-panel-main-with-side').append(this.$el);
                if (!this.$el.is(':visible')) {
                    this.$el.show();
                }
            } else {
                this.$el.show();
            }
        }

    });

    return View;
});

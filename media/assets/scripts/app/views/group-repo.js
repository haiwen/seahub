define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var GroupRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#group-repo-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .cancel-share': 'unshare'
        },

        initialize: function(options) {
            this.group_id = options.group_id;
            this.is_staff = options.is_staff;

            this.listenTo(this.model, 'destroy', this.remove);
        },

        render: function() {
            var obj = this.model.toJSON();
            $.extend(obj, {
                group_id: this.group_id,
                is_staff: this.is_staff
            });
            this.$el.html(this.template(obj));
            return this;
        },

        highlight: function() {
            this.$el.addClass('hl').find('.op-icon').removeClass('vh');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl').find('.op-icon').addClass('vh');
        },

        unshare: function() {
            var lib_name = this.model.get('name');
            this.model.destroy({
                wait: true,
                success: function() {
                    var msg = gettext('Successfully unshared {placeholder}').replace('{placeholder}', '<span class="op-target">' + Common.HTMLescape(lib_name) + '</span>');
                    Common.feedback(msg, 'success', Common.SUCCESS_TIMOUT);
                },
                error: function(model, response) {
                    var err;
                    if (response.responseText) {
                        err = $.parseJSON(response.responseText).error_msg;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err, 'error');
                }
            });
        }

    });

    return GroupRepoView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'marked'
], function($, _, Backbone, Common, Marked) {
    'use strict';

    var View = Backbone.View.extend({
        tagName: 'li',
        className: 'user-item cspt ovhd',

        template: _.template($('#group-discussion-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight'
        },

        initialize: function() {
        },

        render: function() {
            var obj = this.model.attributes;
            Common.getMomentWithLocale(obj['created_at']);
            _.extend(obj, {
                'content_marked': Marked(obj.content, { breaks: true })
            });
            this.$el.html(this.template(obj));
            return this;
        },

        highlight: function() {
            this.$el.addClass('hl');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl');
        }

    });

    return View;
});

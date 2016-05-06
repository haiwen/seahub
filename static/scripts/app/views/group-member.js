define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        tagName: 'li',
        className: 'user-item cspt ovhd',

        template: _.template($('#group-member-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click': 'visitMemberProfile'
        },

        initialize: function(options) {
            this.is_owner = options.is_owner;
        },

        render: function() {
            var obj = {
                is_owner: this.is_owner,
            };
            $.extend(obj, this.model.attributes);
            this.$el.html(this.template(obj));
            return this;
        },

        highlight: function() {
            this.$el.addClass('hl');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl');
        },

        visitMemberProfile: function() {
            location.href = Common.getUrl({
                'name': 'user_profile',
                'username': encodeURIComponent(this.model.get('email'))
            });
        }

    });

    return View;
});

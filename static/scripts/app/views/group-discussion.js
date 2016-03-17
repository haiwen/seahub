define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'marked',
    'moment'
], function($, _, Backbone, Common, Marked, Moment) {
    'use strict';

    var View = Backbone.View.extend({
        tagName: 'li',
        className: 'msg cspt ovhd',

        template: _.template($('#group-discussion-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight'
        },

        initialize: function() {
        },

        render: function() {
            var obj = this.model.attributes;
            var m = Moment(obj['created_at']);

            var user_profile_url = Common.getUrl({
                'name': 'user_profile',
                'username': encodeURIComponent(obj.user_email)
            });
            _.extend(obj, {
                'content_marked': Marked(obj.content, { breaks: true }),
                'time': m.format('LLLL'),
                'time_from_now': Common.getRelativeTimeStr(m),
                'user_profile_url': user_profile_url
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

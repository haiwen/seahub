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
        className: 'msg ovhd',

        template: _.template($('#group-discussion-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .js-del-msg': 'delMessage',
            'click .js-reply-msg': 'reply'
        },

        initialize: function(options) {
            this.listenTo(this.model, 'destroy', this.remove);
            this.parentView = options.parentView;
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
        },

        reply: function() {
            this.parentView.beginReply(this.model.get("user_name"));
        },

        delMessage: function() {
            this.model.destroy({
                wait: true,
                success: function() {
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

    return View;
});

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
            'focus *': 'focusItem',
            'click .js-del-msg': 'delMessage',
            'click .js-reply-msg': 'reply'
        },

        initialize: function(options) {
            this.listenTo(this.model, 'destroy', this.remove);
            this.parentView = options.parentView;
            this.is_group_owner = options.is_group_owner;
            this.is_group_admin = options.is_group_admin;
        },

        render: function() {
            var obj = this.model.attributes;
            var m = Moment(obj['created_at']);

            var can_delete_msg = false;
            if (this.is_group_owner ||
                this.is_group_admin ||
                this.model.get('user_email') == app.pageOptions.username) {
                can_delete_msg = true;
            }

            var user_profile_url = Common.getUrl({
                'name': 'user_profile',
                'username': encodeURIComponent(obj.user_email)
            });
            _.extend(obj, {
                'content_marked': Marked(obj.content, {
                    breaks: true,
                    sanitize: true
                }),
                'time': m.format('LLLL'),
                'time_from_now': Common.getRelativeTimeStr(m),
                'can_delete_msg': can_delete_msg,
                'user_profile_url': user_profile_url
            });
            this.$el.html(this.template(obj));
            return this;
        },

        highlight: function() {
            this.$el.addClass('hl');
            this.$('.msg-ops').removeClass('vh');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl');
            this.$('.msg-ops').addClass('vh');
        },

        focusItem: function() {
            $('.msg.hl', this.$el.parent())
                .removeClass('hl')
                .find('.msg-ops').addClass('vh');

            this.highlight();
        },

        reply: function() {
            this.parentView.replyTo(this.model.get("user_name"));
            return false;
        },

        delMessage: function() {
            this.model.destroy({
                wait: true,
                success: function() {
                },
                error: function(model, response) {
                    var error_msg = Common.prepareAjaxErrorMsg(response);
                    Common.feedback(error_msg, 'error');
                }
            });
            return false;
        }

    });

    return View;
});

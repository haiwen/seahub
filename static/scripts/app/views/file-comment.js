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

        template: _.template($('#file-comment-tmpl').html()),

        initialize: function(options) {
            this.listenTo(this.model, 'destroy', this.remove);

            this.is_repo_owner = options.is_repo_owner;
            this.parentView = options.parentView;
        },

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .js-del-msg': 'delMsg',
            'click .js-reply-msg': 'reply'
        },

        highlight: function() {
            this.$el.addClass('hl');
            this.$('.msg-ops').removeClass('vh');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl');
            this.$('.msg-ops').addClass('vh');
        },

        delMsg: function() {
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
        },

        reply: function() {
            this.parentView.replyTo(this.model.get('user_name'));
            return false;
        },

        render: function() {
            var user_email = this.model.get('user_email');

            var can_delete_msg = false;
            if (this.is_repo_owner ||
                user_email == app.pageOptions.username) {
                can_delete_msg = true;
            }

            var user_profile_url = Common.getUrl({
                'name': 'user_profile',
                'username': encodeURIComponent(user_email)
            });

            var obj = this.model.attributes;
            var m = Moment(obj.created_at);
            var data = $.extend({}, obj, {
                'content_marked': Marked(obj.comment, {
                    breaks: true,
                    sanitize: true
                }),
                'time': m.format('LLLL'),
                'time_from_now': Common.getRelativeTimeStr(m),
                'can_delete_msg': can_delete_msg,
                'user_profile_url': user_profile_url
            });

            this.$el.html(this.template(data));
            return this;
        }

    });

    return View;
});

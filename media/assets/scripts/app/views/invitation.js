define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var InvitationView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#invitation-item-tmpl').html()),

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        events: {
            'click .rm-invitation': 'removeInvitation'
        },

        removeInvitation: function(e) {
            var _this = this;

            var $el = $(e.currentTarget);
            $el.hide(); // hide the icon to avoid being clicked repeatedly

            $.ajax({
                url: Common.getUrl({
                    'name': 'invitation',
                    'token': this.model.get('token')
                }),
                type: 'DELETE',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Successfully deleted 1 item."), 'success');
                },
                error: function(xhr) {
                    $el.show();
                    Common.ajaxErrorHandler(xhr);
                }
            });

            return false;
        },

        render: function() {
            var data = this.model.toJSON();

            var invite_time = Moment(data['invite_time']);
            var expire_time = Moment(data['expire_time']);

            data['invite_time_format'] = invite_time.format('LLLL');
            data['expire_time_format'] = expire_time.format('LLLL');

            data['invite_time_from_now'] = invite_time.format('YYYY-MM-DD');
            data['expire_time_from_now'] = expire_time.format('YYYY-MM-DD');

            this.$el.html(this.template(data));

            return this;
        }

    });

    return InvitationView;
});

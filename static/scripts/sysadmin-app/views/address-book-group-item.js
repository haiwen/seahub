define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var GroupView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#address-book-group-item-tmpl').html()),

        events: {
            'click .group-delete-btn': 'deleteGroup'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        deleteGroup: function() {
            var _this = this;
            var group_name = this.model.get('name');
            var popupTitle = gettext("Delete Group");
            var popupContent = gettext("Are you sure you want to delete %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(group_name) + '">' + Common.HTMLescape(group_name) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({
                        'name':'admin-address-book-group',
                        'group_id': _this.model.get('id')
                    }),
                    type: 'DELETE',
                    cache: false,
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$el.remove();
                        Common.feedback(gettext("Successfully deleted 1 item."), 'success');
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                    },
                    complete: function() {
                        $.modal.close();
                    }
                });
            };
            Common.showConfirm(popupTitle, popupContent, yesCallback);
            return false;
        },

        render: function() {
            var data = this.model.toJSON(),
                created_at = Moment(data['created_at']);

            data['time'] = created_at.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(created_at);

            this.$el.html(this.template(data));

            return this;
        }

    });

    return GroupView;
});

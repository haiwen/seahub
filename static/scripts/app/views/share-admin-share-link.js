define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var ShareAdminShareLinkView = HLItemView.extend({

        tagName: 'tr',

        template: _.template($('#share-admin-download-link-tmpl').html()),
        linkPopupTemplate: _.template($('#share-admin-link-popup-tmpl').html()),

        events: {
            'click .rm-link': 'removeLink',
            'click .view-link': 'viewLink'
        },

        initialize: function(option) {
            HLItemView.prototype.initialize.call(this);
        },

        viewLink: function() {
            var $popup = $(this.linkPopupTemplate({'link': this.model.get('link')}));
            $popup.modal({focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            var $p = $('p', $popup),
                $input = $('input', $popup);
            $input.css({'width': $p.width() + 2});
            $p.hide();
            $input.show();
            $input.on('click', function() {
                $(this).trigger('select');
            });
            return false;
        },

        removeLink: function() {

            var _this = this;

            var popupTitle = gettext("Are you sure you want to remove the share link?");
            var popupContent = gettext("If the share link is removed, no one will be able to access it any more.");
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({
                        'name': 'share_admin_share_link',
                        'token': _this.model.get('token')
                    }),
                    type: 'DELETE',
                    beforeSend: Common.prepareCSRFToken,
                    success: function() {
                        _this.remove();
                        Common.feedback(gettext("Successfully deleted 1 item"), 'success');
                    },
                    error: function(xhr) {
                        Common.ajaxErrorHandler(xhr);
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
            var data = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 96 : 24;
            var icon_url = this.model.getIconUrl(icon_size);

            _.extend(data, {
                'icon_url': icon_url,
                'dirent_url': this.model.getWebUrl(),
                'time': data['expire_date'] ? Moment(data['expire_date']).format('YYYY-MM-DD') : ''
            });

            this.$el.html(this.template(data));
            return this;
        }

    });

    return ShareAdminShareLinkView;
});

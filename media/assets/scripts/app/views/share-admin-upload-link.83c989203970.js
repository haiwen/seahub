define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, HLItemView) {
    'use strict';

    var ShareAdminUploadLinkView = HLItemView.extend({

        tagName: 'tr',

        template: _.template($('#share-admin-upload-link-tmpl').html()),
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

            $.ajax({
                url: Common.getUrl({
                    'name': 'share_admin_upload_link',
                    'token': this.model.get('token')
                }),
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Successfully deleted 1 item"), 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });

            return false;
        },

        render: function() {
            var data = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 96 : 24;
            var icon_url = this.model.getIconUrl(icon_size);

            _.extend(data, {
                'icon_url': icon_url,
                'dirent_url': this.model.getWebUrl()
            });

            this.$el.html(this.template(data));
            return this;
        }

    });

    return ShareAdminUploadLinkView;
});

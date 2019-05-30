define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#repo-shared-link-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .rm-link': 'removeLink'
        },

        initialize: function(options) {
            this.data = {};
            $.extend(this.data, options);
        },

        render: function() {
            var obj = {}; 

            var path = this.model.get('path'),
                _path = path,
                formattedSize = ''; // no 'size' for dir item

            $.extend(obj, this.model.attributes);

            // no 'share_type' in upload link model
            if (this.data.link_type == 'upload') {
                $.extend(obj, {
                    'share_type': 'd' // 'd': dir
                });
            }

            var icon_size = Common.isHiDPI() ? 48 : 24;
            var icon_url;
            if (obj.share_type == 'd') {
                // path is ended with '/'
                _path = path.substring(0, path.length - 1);
                icon_url = Common.getDirIconUrl(false, icon_size); // is_readonly: false
            } else {
                formattedSize = Common.fileSizeFormat(this.model.get('size'), 1);
                icon_url = Common.getFileIconUrl(this.model.get('name'), icon_size);
            }
            $.extend(obj, {
                'repo_id': this.data.repo_id,
                'icon_url': icon_url,
                'formattedSize': formattedSize,
                'encoded_path': Common.encodePath(_path)
            });

            this.$el.html(this.template(obj));
            return this;
        },

        highlight: function() {
            this.$el.addClass('hl').find('.op-icon').removeClass('vh');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl').find('.op-icon').addClass('vh');
        },

        removeLink: function() {
            var url = Common.getUrl({
                name: this.data.link_type == 'download' ? 'repo_shared_download_link' : 'repo_shared_upload_link',
                repo_id: this.data.repo_id,
                token: this.model.get('token')
            });
            var _this = this;
            $.ajax({
                url: url,
                type: 'delete',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.data.$error.html(error_msg).show();
                }
            });

            return false;
        }

    });

    return View;
});

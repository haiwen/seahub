define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, HLItemView) {
    'use strict';

    var StarredFileView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#starred-file-item-tmpl').html()),
        mobileTemplate: _.template($('#starred-file-item-mobile-tmpl').html()),

        events: {
            'click .unstar': 'removeShare'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);

            this.listenTo(this.model, "change", this.render);
        },

        render: function () {
            var data = this.model.toJSON();

            var file_icon_size = Common.isHiDPI() ? 48 : 24;
            data.file_icon_url = Common.getFileIconUrl(data.file_name, file_icon_size);

            data['is_img'] = Common.imageCheck(data['file_name']);
            data['encoded_path'] = Common.encodePath(data['path']);
            data.encoded_thumbnail_src = this.model.get('encoded_thumbnail_src') || '';

            var tmpl = $(window).width() >= 768 ? this.template : this.mobileTemplate;
            this.$el.html(tmpl(data));

            if (data['is_img']) {
                var file_name = this.model.get('file_name');
                var file_ext = file_name.substr(file_name.lastIndexOf('.') + 1).toLowerCase();
                var is_gif = file_ext == 'gif' ? true : false;

                if (app.pageOptions.enable_thumbnail && !is_gif) {
                    this.$('.img-name-link').attr('data-mfp-src', Common.getUrl({
                        'name': 'thumbnail_get',
                        'repo_id': data.repo_id,
                        'size': app.pageOptions.thumbnail_size_for_original,
                        'path': data.encoded_path
                    }));
                }
            }

            return this;
        },

        removeShare: function() {
            var _this = this,
                repo_id = this.model.get('repo_id'),
                file_name = this.model.get('file_name'),
                path = this.model.get('path');

            $.ajax({
                url: Common.getUrl({name: 'starred_files'}) + '?p=' + encodeURIComponent(path) + '&repo_id=' + encodeURIComponent(repo_id),
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Successfully unstared {placeholder}").replace('{placeholder}', file_name), 'success');
                },
                error: function (xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });

            return false;
        }

    });

    return StarredFileView;
});

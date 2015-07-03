define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var StarredFileView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#starred-file-item-tmpl').html()),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .unstar': 'removeShare'
        },

        initialize: function() {
        },

        render: function () {
            var data = this.model.toJSON();

            data['is_img'] = Common.imageCheck(data['file_name']);
            data['encoded_path'] = Common.encodePath(data['path']);

            this.$el.html(this.template(data));
            return this;
        },

        removeShare: function() {
            var _this = this,
                repo_id = this.model.get('repo'),
                file_name = this.model.get('file_name'),
                path = this.model.get('path');

            $.ajax({
                url: Common.getUrl({name: 'starred_files'}) + '?p=' + path + '&repo_id=' + repo_id,
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Successfully unstared {placeholder}").replace('{placeholder}', Common.HTMLescape(file_name)), 'success');
                },
                error: function(xhr) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err, 'error');
                }
            });
        },

        showAction: function() {
            this.$el.addClass('hl');
            this.$el.find('.op-icon').removeClass('vh');
        },

        hideAction: function() {
            this.$el.removeClass('hl');
            this.$el.find('.op-icon').addClass('vh');
        }

    });

    return StarredFileView;
});

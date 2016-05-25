define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var LibraryView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#trash-library-item-tmpl').html()),

        events: {
            'click .repo-delete-btn': 'deleteTrashLibrary',
            'click .repo-restore-btn': 'restoreTrashLibrary',
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        deleteTrashLibrary: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({'name':'admin-trash-library', 'repo_id': _this.model.get('id')}),
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function() {
                    _this.$el.remove();
                    Common.feedback(gettext("Success"), 'success');
                },
                error: function(xhr, textStatus, errorThrown) {
                    Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                }
            })
            return false;
        },

        restoreTrashLibrary: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({'name':'admin-trash-library', 'repo_id': _this.model.get('id')}),
                type: 'PUT',
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function() {
                    _this.$el.remove();
                    Common.feedback(gettext("Success"), 'success');
                },
                error: function(xhr, textStatus, errorThrown) {
                    Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                }
            })
            return false;
        },

        render: function() {
            var data = this.model.toJSON(),
                delete_time = Moment(data['delete_time']);

            data['time'] = delete_time.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(delete_time);

            this.$el.html(this.template(data));

            return this;
        }

    });

    return LibraryView;
});

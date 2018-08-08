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

        template: _.template($('#group-item-tmpl').html()),
        transferTemplate: _.template($('#group-transfer-form-tmpl').html()),

        events: {
            'click .group-delete-btn': 'deleteGroup',
            'click .group-transfer-btn': 'transferGroup'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
            this.listenTo(this.model, "change", this.render);
        },

        deleteGroup: function() {
            var _this = this;
            var group_name = this.model.get('name');
            var popupTitle = gettext("Delete Group");
            var popupContent = gettext("Are you sure you want to delete %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(group_name) + '">' + Common.HTMLescape(group_name) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({
                        'name':'admin-group',
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

        transferGroup: function() {
            var _this = this;
            var group_name = this.model.get('name');
            var group_id = this.model.get('id');
            var cur_owner = this.model.get('owner');
            var $form = $(this.transferTemplate({
                title: gettext("Transfer Group {group_name} To").replace('{group_name}',
                           '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(group_name) + '">' + Common.HTMLescape(group_name) + '</span>')
            }));

            $form.modal({focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
            $('[name="email"]', $form).select2($.extend(
                Common.contactInputOptionsForSelect2(), {
                width: '300px',
                maximumSelectionSize: 1,
                placeholder: gettext("Search user or enter email and press Enter"), // to override 'placeholder' returned by `Common.conta...`
                formatSelectionTooBig: gettext("You cannot select any more choices")
            }));

            $form.on('submit', function() {
                var email = $.trim($('[name="email"]', $(this)).val());
                var $submitBtn = $('[type="submit"]', $(this));

                if (!email) {
                    return false;
                }
                if (email == cur_owner) {
                    return false;
                }

                Common.disableButton($submitBtn);
                $.ajax({
                    url: Common.getUrl({'name': 'admin-group', 'group_id': group_id}),
                    type: 'put',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: {
                        'new_owner': email
                    },
                    success: function() {
                        $.modal.close();
                        _this.model.set({'owner': email}); // it will trigger 'change' event
                        Common.feedback(gettext("Successfully transferred the group."), 'success');
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $('.error', $form).html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
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

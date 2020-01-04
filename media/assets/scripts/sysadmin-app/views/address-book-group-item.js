define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'simplemodal',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, Simplemodal, HLItemView) {
    'use strict';

    var GroupView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#address-book-group-item-tmpl').html()),
        setQuotaFormTemplate: _.template($('#address-book-group-quota-set-form-tmpl').html()),

        events: {
            'click .group-delete-btn': 'deleteGroup',
            'click .quota-edit-icon': 'setQuota'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);

            this.listenTo(this.model, "change", this.render);
        },

        deleteGroup: function() {
            var _this = this;
            var group_name = this.model.get('name');
            var url_options = {
                'group_id': _this.model.get('id')
            };
            if (app.pageOptions.org_id) { // org admin
                $.extend(url_options, {
                    'name':'org-admin-address-book-group',
                    'org_id': app.pageOptions.org_id
                });
            } else {
                $.extend(url_options, {
                    'name':'admin-address-book-group'
                });
            }

            var popupTitle = gettext("Delete Department");
            var popupContent = gettext("Are you sure you want to delete %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(group_name) + '">' + Common.HTMLescape(group_name) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl(url_options),
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

        setQuota: function() {
            var model = this.model;

            var $form = $(this.setQuotaFormTemplate());
            $form.modal();
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $form.on('submit', function() {
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);
                var quota = $.trim($('[name="quota"]', $form).val());
                var quota_int = parseInt(quota);

                if (!quota) {
                    $error.html(gettext("It is required.")).show();
                    return false;
                }

                if (!(quota_int == quota &&
                    (quota_int > 0 || quota_int == -2))) {
                    $error.html(gettext("Invalid quota.")).show();
                    return false;
                }

                var url_options;
                if (app.pageOptions.org_id) { // org admin
                    url_options = {
                        'name':'org-admin-group',
                        'org_id': app.pageOptions.org_id,
                        'group_id': model.get('id')
                    };
                } else {
                    url_options = {
                        'name':'admin-group',
                        'group_id': model.get('id')
                    };
                }

                Common.disableButton($submitBtn);
                $.ajax({
                    url: Common.getUrl(url_options),
                    type: 'PUT',
                    cache: false,
                    beforeSend: Common.prepareCSRFToken,
                    data: {'quota': quota == -2 ? -2 : quota * 1000000},
                    dataType: 'json',
                    success: function(data) {
                        model.set({'quota': data.quota});
                        $.modal.close();
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $error.html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });

                return false;
            });
        },

        render: function() {
            var data = this.model.toJSON(),
                created_at = Moment(data['created_at']);

            data['time'] = created_at.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(created_at);

            data['quota_error'] = false;
            switch(data['quota']) {
                case -2: // no limit
                    data['quota_shown'] = '--';
                    break;
                case -1: // not set or error
                    data['quota_shown'] = gettext("Error");
                    data['quota_error'] = true;
                    break;
                default:
                    if (data['quota'] > 0) {
                        data['quota_shown'] = Common.quotaSizeFormat(data['quota']);
                    } else {
                        data['quota_shown'] = gettext("Error");
                        data['quota_error'] = true;
                    }
            }

            this.$el.html(this.template(data));

            return this;
        }

    });

    return GroupView;
});

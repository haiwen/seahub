define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var HistorySettingsDialog = Backbone.View.extend({
        tagName: 'div',
        id: 'history-settings-dialog',
        template: _.template($('#history-settings-dialog-tmpl').html()),

        initialize: function(options) {
            this.repo_name = options.repo_name;
            this.repo_id = options.repo_id;

            this.render();
            this.$el.modal();
            $("#simplemodal-container").css({'height':'auto'});

            this.$loadingTip = this.$('.loading-tip');
            this.$error = this.$('.error');
            this.$form = this.$('#repo-history-settings-form');
            this.$radios = this.$('input:radio[name=history]');
            this.$days_input = this.$('input:text[name=days]');
            this.$submit = this.$('input[type=submit]');

            this.renderHistorySettings();

            // only enable setting keep_days when partial history radio is chosen
            var _this = this;
            this.$radios.change(function() {
                var value = $(this).attr('value');

                if (value == 'full_history' || value == 'no_history') {
                    _this.$days_input.prop('disabled', true).addClass('input-disabled');
                } else {
                    _this.$days_input.prop('disabled', false).removeClass('input-disabled');
                }
            });
        },

        render: function() {
            this.$el.html(this.template({
                title: gettext("{placeholder} History Settings")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(this.repo_name) + '">'
                    + Common.HTMLescape(this.repo_name) + '</span>'),
                repo_id: this.repo_id,
                default_history_limit: 30
            }));

            return this;
        },

        events: {
            'submit form': 'formSubmit'
        },

        renderHistorySettings: function() {
            var _this = this;

            $.ajax({
                url: Common.getUrl({
                    'name': 'repo_history_limit',
                    'repo_id': _this.repo_id
                }),
                type: 'get',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                success: function(data) { // data: { keep_days: -1 }
                    _this.$loadingTip.hide();

                    if (data.keep_days <= -1) {
                        _this.$radios.filter('[value=full_history]').prop('checked', true);
                    } else if (data.keep_days == 0) {
                        _this.$radios.filter('[value=no_history]').prop('checked', true);
                    } else {
                        _this.$radios.filter('[value=partial_history]').prop('checked', true);
                        _this.$days_input.prop('disabled', false).removeClass('input-disabled');
                        _this.$days_input.attr('value', data.keep_days);
                    }

                    if (!app.pageOptions.enable_repo_history_setting) {
                        _this.$('.history-settings-notice').removeClass('hide');
                        _this.$radios.prop('disabled', true);
                        _this.$days_input.prop('disabled', true).addClass('input-disabled');
                        _this.$submit.prop('disabled', true).addClass('btn-disabled');
                    }
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    _this.$error.html(err_msg).show();
                }
            });
        },

        formSubmit: function() {
            var days;
            var value = this.$radios.filter(':checked').val();
            var _this = this;

            if (value == 'partial_history') {
                days = this.$days_input.val();
            } else if (value == 'full_history') {
                days = -1;
            } else {
                days = 0;
            }

            this.$submit.prop('disabled', true);

            $.ajax({
                url: Common.getUrl({
                    'name': 'repo_history_limit',
                    'repo_id': _this.repo_id
                }),
                type: 'put',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'keep_days': days
                },
                success: function(data) {
                    $.modal.close();
                    Common.feedback(gettext("Set library history succeeded."), 'success');
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    _this.$error.html(err_msg).show();
                    Common.enableButton(_this.$submit);
                }
            });
            return false;
        }

    });

    return HistorySettingsDialog;
});

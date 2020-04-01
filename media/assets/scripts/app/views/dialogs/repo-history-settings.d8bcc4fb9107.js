define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var HistorySettingsDialog = Backbone.View.extend({

        template: _.template($('#history-settings-dialog-tmpl').html()),

        initialize: function(options) {
            this.repo_name = options.repo_name;
            this.repo_id = options.repo_id;
            this.url_name = options.url_name;
            this.is_admin_panel = options.is_admin_panel;

            this.render();
            this.$('.op-target').css({'max-width':280}); // for long repo name
            this.$el.modal();
            $("#simplemodal-container").css({'height':'auto'});

            this.$loadingTip = this.$('.loading-tip');
            this.$error = this.$('.error');
            this.$form = this.$('form');
            this.$radios = this.$('input:radio[name=history]');
            this.$days_input = this.$('input:text[name=days]');
            this.$submit = this.$('[type=submit]');

            this.renderHistorySettings();
        },

        render: function() {
            var repo_name = this.repo_name;
            this.$el.html(this.template({
                title: gettext("{placeholder} History Setting")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(repo_name) + '">'
                    + Common.HTMLescape(repo_name) + '</span>'),
                default_history_limit: 30
            }));

            return this;
        },

        renderHistorySettings: function() {
            var _this = this;

            $.ajax({
                url: Common.getUrl({
                    'name': this.url_name,
                    'repo_id': this.repo_id
                }),
                type: 'get',
                dataType: 'json',
                success: function(data) {
                    _this.$loadingTip.hide();

                    if (data.keep_days <= -1) {
                        _this.$radios.filter('[value=full_history]').prop('checked', true);
                    } else if (data.keep_days == 0) {
                        _this.$radios.filter('[value=no_history]').prop('checked', true);
                    } else {
                        _this.$radios.filter('[value=partial_history]').prop('checked', true);
                        _this.$days_input.prop('disabled', false).removeClass('input-disabled');
                        _this.$days_input.val(data.keep_days);
                    }
                    _this.$radios.filter(':checked').trigger('focus');

                    if (!app.pageOptions.enable_repo_history_setting && !_this.is_admin_panel) {
                        _this.$('.history-settings-notice').removeClass('hide');
                        _this.$radios.prop('disabled', true);
                        _this.$days_input.prop('disabled', true).addClass('input-disabled');
                        _this.$submit.prop('disabled', true).addClass('btn-disabled');
                    }
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$error.html(error_msg).show();
                }
            });
        },

        events: {
            'change [name="history"]': 'changeHistorySetting',
            'submit form': 'formSubmit'
        },

        // only enable setting keep_days when partial history radio is chosen
        changeHistorySetting: function(e) {
            var value = $(e.currentTarget).val();
            var $days_input = this.$days_input;
            
            if (value == 'full_history' || value == 'no_history') {
                $days_input.prop('disabled', true).addClass('input-disabled');
            } else {
                $days_input.prop('disabled', false).removeClass('input-disabled');
            }
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
                    'name': this.url_name,
                    'repo_id': this.repo_id
                }),
                type: 'put',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'keep_days': days
                },
                success: function() {
                    $.modal.close();
                    Common.feedback(gettext("Successfully set library history."), 'success');
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$error.html(error_msg).show();
                    Common.enableButton(_this.$submit);
                }
            });
            return false;
        }

    });

    return HistorySettingsDialog;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'simplemodal',
    'select2',
    'sysadmin-app/views/share',
    'app/views/dialogs/repo-history-settings',
    'app/views/widgets/hl-item-view',
    'app/views/widgets/dropdown'
], function($, _, Backbone, Common, Moment, Simplemodal,
    Select2, ShareView, HistorySettingsDialog,
    HLItemView, DropdownView) {

    'use strict';

    var RepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#library-item-tmpl').html()),
        transferTemplate: _.template($('#library-transfer-form-tmpl').html()),

        events: {
            'click .js-repo-share': 'share',
            'click .js-popup-history-setting': 'popupHistorySetting',
            'click .repo-delete-btn': 'deleteLibrary',
            'click .repo-transfer-btn': 'transferLibrary'
        },

        share: function() {
            var options = {
                'repo_id': this.model.get('id'),
                'repo_name': this.model.get('name')
            };
            new ShareView(options);
            this.togglePopup(); // close the popup
            return false;
        },

        popupHistorySetting: function() {
            var options = {
                'repo_name': this.model.get('name'),
                'repo_id': this.model.get('id'),
                'is_admin_panel': true,
                'url_name': 'admin-library-history-limit'
            };
            this.togglePopup(); // close the popup
            new HistorySettingsDialog(options);
            return false;
        },

        togglePopup: function() {
            this.dropdown.hide();
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
            this.listenTo(this.model, "change", this.render);
        },

        deleteLibrary: function() {
            var _this = this;
            var repo_name = this.model.get('name');
            var popupTitle = gettext("Delete Library");
            var popupContent = gettext("Are you sure you want to delete %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(repo_name) + '">' + Common.HTMLescape(repo_name) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({
                        'name':'admin-library',
                        'repo_id': _this.model.get('id')
                    }),
                    type: 'DELETE',
                    cache: false,
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$el.remove();
                        Common.feedback(gettext("Successfully deleted."), 'success');
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

        transferLibrary: function() {
            var _this = this;
            var repo_name = this.model.get('name');
            var $form = $(this.transferTemplate({
                title: gettext("Transfer Library {library_name} To").replace('{library_name}',
                           '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(repo_name) + '">' + Common.HTMLescape(repo_name) + '</span>')
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
                if (!email) {
                    return false;
                }
                if (email == _this.model.get('owner')) {
                    return false;
                }

                var url = Common.getUrl({'name': 'admin-library','repo_id': _this.model.get('id')});
                var $submitBtn = $('[type="submit"]', $(this));
                Common.disableButton($submitBtn);

                $.ajax({
                    url: url,
                    type: 'put',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: {
                        'owner': email
                    },
                    success: function() {
                        $.modal.close();
                        _this.model.set({'owner': email}); // it will trigger 'change' event
                        Common.feedback(gettext("Successfully transferred the library."), 'success');
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
                icon_size = Common.isHiDPI() ? 48 : 24,
                icon_url = this.model.getIconUrl(icon_size),
                last_accessed = Moment(data['last_accessed']);

            data['icon_url'] = icon_url;
            data['icon_title'] = this.model.getIconTitle();
            data['enable_sys_admin_view_repo'] = app.pageOptions.enable_sys_admin_view_repo;
            data['is_pro'] = app.pageOptions.is_pro;
            data['time'] = last_accessed.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(last_accessed);

            this.$el.html(this.template(data));

            this.dropdown = new DropdownView({
                el: this.$('.sf-dropdown'),
                right: 0
            });

            return this;
        }

    });

    return RepoView;
});

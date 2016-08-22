define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/share',
    'app/views/dialogs/repo-change-password',
    'app/views/dialogs/repo-history-settings',
    'app/views/dialogs/repo-share-link-admin',
    'app/views/dialogs/repo-folder-perm-admin',
    'app/views/widgets/hl-item-view',
    'app/views/widgets/dropdown'
], function($, _, Backbone, Common, ShareView, RepoChangePasswordDialog,
    HistorySettingsDialog, RepoShareLinkAdminDialog, RepoFolderPermAdminDialog,
    HLItemView, DropdownView) {
    'use strict';

    var RepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#repo-tmpl').html()),
        renameTemplate: _.template($("#repo-rename-form-template").html()),
        transferTemplate: _.template($('#repo-transfer-form-tmpl').html()),

        events: {
            'click .repo-delete-btn': 'del',
            'click .repo-share-btn': 'share',
            'click .js-repo-rename': 'rename',
            'click .js-repo-transfer': 'transfer',
            'click .js-repo-change-password': 'changePassword',
            'click .js-popup-history-setting': 'popupHistorySetting',
            'click .js-popup-share-link-admin': 'popupShareLinkAdmin',
            'click .js-popup-folder-perm-admin': 'popupFolderPermAdmin'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);

            this.listenTo(this.model, "change", this.render);
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 96 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            _.extend(obj, {
                'icon_url': icon_url,
                'icon_title': this.model.getIconTitle(),
                'can_generate_share_link': app.pageOptions.can_generate_share_link,
                'can_generate_upload_link': app.pageOptions.can_generate_upload_link
            });
            this.$el.html(this.template(obj));
            this.dropdown = new DropdownView({
                el: this.$('.sf-dropdown')
            });
            return this;
        },

        del: function() {
            var _this = this;
            var repo_name = this.model.get('name');
            var popupTitle = gettext("Delete Library");
            var popupContent = gettext("Are you sure you want to delete %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target">' + Common.HTMLescape(repo_name) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({'name':'repo', 'repo_id': _this.model.get('id')}),
                    type: 'DELETE',
                    cache: false,
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
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
            this.togglePopup();
            return false;
        },

        share: function() {
            var options = {
                'is_repo_owner': true,
                'is_virtual': this.model.get('virtual'),
                'user_perm': 'rw',
                'repo_id': this.model.get('id'),
                'repo_encrypted': this.model.get('encrypted'),
                'is_dir': true,
                'dirent_path': '/',
                'obj_name': this.model.get('name')
            };
            new ShareView(options);
            return false;
        },

        togglePopup: function() {
            this.dropdown.hide();
        },

        rename: function() {
            var repo_name = this.model.get('name');

            var form = $(this.renameTemplate({
                repo_name: repo_name
            }));

            var $name_span = this.$('.repo-name-span'),
                $op_td = this.$('.repo-op-td'),
                $name_td = $name_span.closest('td');
            $name_td.attr('colspan', 2).css({
                'width': $name_span.width() + $op_td.outerWidth(),
                'height': $name_span.height()
            }).append(form);
            $op_td.hide();
            $name_span.hide();
            $('[name="newname"]', form).select();

            this.togglePopup();
            app.ui.freezeItemHightlight = true;

            var cancelRename = function() {
                app.ui.freezeItemHightlight = false;
                form.remove();
                $op_td.show();
                $name_span.show();
                $name_td.attr('colspan', 1).css({
                    'width': $name_span.width()
                });
                return false; // stop bubbling (to 'doc click to hide .hidden-op')
            };
            $('.cancel', form).click(cancelRename);

            var form_id = form.attr('id');
            var _this = this;
            form.submit(function() {
                var new_name = $.trim($('[name="newname"]', form).val());
                if (!new_name) {
                    return false;
                }
                if (new_name == repo_name) {
                    cancelRename();
                    return false;
                }
                var post_data = {
                    'repo_name': new_name
                };
                var post_url = Common.getUrl({
                    name: 'repo',
                    repo_id: _this.model.get('id')
                }) + '?op=rename';
                var after_op_success = function(data) {
                    app.ui.freezeItemHightlight = false;
                    _this.model.set({ 'name': new_name }); // it will trigger 'change' event
                };
                var after_op_error = function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err_msg, 'error');
                    Common.enableButton(submit_btn);
                };

                var submit_btn = $('[type="submit"]', form);
                Common.disableButton(submit_btn);
                $.ajax({
                    url: post_url,
                    type: 'POST',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: post_data,
                    success: after_op_success,
                    error: after_op_error
                });
                return false;
            });

            return false;
        },

        transfer: function() {
            var _this = this;
            this.togglePopup(); // Close the popup

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

            $form.submit(function() {
                var email = $.trim($('[name="email"]', $(this)).val());
                if (!email) {
                    return false;
                }
                if (email == _this.model.get('owner')) {
                    return false;
                }

                var $submitBtn = $('[type="submit"]', $(this));
                Common.disableButton($submitBtn);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'repo_owner',
                        'repo_id': _this.model.get('id')
                    }),
                    type: 'put',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: {
                        'owner': email
                    },
                    success: function() {
                        $.modal.close();
                        _this.remove();
                        Common.feedback(gettext("Successfully transferred the library."), 'success');
                    },
                    error: function(xhr) {
                        var error_msg;
                        if (xhr.responseText) {
                            error_msg = $.parseJSON(xhr.responseText).error_msg;
                        } else {
                            error_msg = gettext("Failed. Please check the network.");
                        }
                        $('.error', $form).html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
        },

        popupHistorySetting: function() {
            var options = {
                'repo_name': this.model.get('name'),
                'repo_id': this.model.get('id')
            };
            this.togglePopup(); // close the popup
            new HistorySettingsDialog(options);
            return false;
        },

        popupShareLinkAdmin: function() {
            var options = {
                'repo_name': this.model.get('name'),
                'repo_id': this.model.get('id')
            };
            this.togglePopup(); // close the popup
            new RepoShareLinkAdminDialog(options);
            return false;
        },

        popupFolderPermAdmin: function() {
            var options = {
                'repo_name': this.model.get('name'),
                'repo_id': this.model.get('id')
            };
            this.togglePopup(); // close the popup
            new RepoFolderPermAdminDialog(options);
            return false;
        },

        changePassword: function () {
            var options = {
                'repo_name': this.model.get('name'),
                'repo_id': this.model.get('id')
            };
            this.togglePopup(); // close the popup
            new RepoChangePasswordDialog(options);
            return false;
        }

    });

    return RepoView;
});

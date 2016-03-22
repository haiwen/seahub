define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/share',
    'app/views/dialogs/repo-change-password',
    'app/views/dialogs/repo-history-settings',
    'app/views/dialogs/repo-share-link-admin',
    'app/views/dialogs/repo-folder-perm-admin'
], function($, _, Backbone, Common, ShareView, RepoChangePasswordDialog,
    HistorySettingsDialog, RepoShareLinkAdminDialog, RepoFolderPermAdminDialog) {
    'use strict';

    var RepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#repo-tmpl').html()),
        repoDelConfirmTemplate: _.template($('#repo-del-confirm-template').html()),
        renameTemplate: _.template($("#repo-rename-form-template").html()),
        transferTemplate: _.template($('#repo-transfer-form-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .repo-delete-btn': 'del',
            'click .repo-share-btn': 'share',
            'click .js-toggle-popup': 'togglePopup',
            'click .js-repo-rename': 'rename',
            'click .js-repo-transfer': 'transfer',
            'click .js-repo-change-password': 'changePassword',
            'click .js-popup-history-setting': 'popupHistorySetting',
            'click .js-popup-share-link-admin': 'popupShareLinkAdmin',
            'click .js-popup-folder-perm-admin': 'popupFolderPermAdmin'
        },

        initialize: function() {
            this.listenTo(this.model, "change", this.render);
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 96 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            _.extend(obj, {
                'icon_url': icon_url,
                'icon_title': this.model.getIconTitle()
            });
            this.$el.html(this.template(obj));
            return this;
        },

        // disable 'hover' when 'repo-del-confirm' popup is shown
        highlight: function() {
            if ($('#my-own-repos .repo-del-confirm').length == 0
                && !$('.hidden-op:visible').length
                && !$('#repo-rename-form').length) {
                this.$el.addClass('hl').find('.op-icon').removeClass('vh');
            }
        },

        rmHighlight: function() {
            if ($('#my-own-repos .repo-del-confirm').length == 0
                && !$('.hidden-op:visible').length
                && !$('#repo-rename-form').length) {
                this.$el.removeClass('hl').find('.op-icon').addClass('vh');
            }
        },

        del: function() {
            var del_icon = this.$('.repo-delete-btn');
            var op_container = this.$('.op-container').css({'position': 'relative'});

            var confirm_msg = gettext("Really want to delete {lib_name}?")
                .replace('{lib_name}', '<span class="op-target">' + Common.HTMLescape(this.model.get('name')) + '</span>');
            var confirm_popup = $(this.repoDelConfirmTemplate({
                content: confirm_msg
            }))
            .appendTo(op_container)
            .css({
                'left': del_icon.position().left,
                'top': del_icon.position().top + del_icon.height() + 2,
                'width': 180
            });

            var _this = this;
            $('.no', confirm_popup).click(function() {
                confirm_popup.addClass('hide').remove(); // `addClass('hide')`: to rm cursor
                _this.rmHighlight();
            });
            $('.yes', confirm_popup).click(function() {
                $.ajax({
                    url: Common.getUrl({'name':'repo_del', 'repo_id': _this.model.get('id')}),
                    type: 'POST',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data) {
                        _this.remove();
                        Common.feedback(gettext("Delete succeeded."), 'success');
                    },
                    error: function(xhr) {
                        confirm_popup.addClass('hide').remove();
                        _this.rmHighlight();

                        var err;
                        if (xhr.responseText) {
                            err = $.parseJSON(xhr.responseText).error;
                        } else {
                            err = gettext("Failed. Please check the network.");
                        }
                        Common.feedback(err, 'error');
                    }
                });
            });
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
        },

        togglePopup: function() {
            var $icon = this.$('.js-toggle-popup'),
                $popup = this.$('.hidden-op');

            if ($popup.hasClass('hide')) { // the popup is not shown
                $popup.css({'left': $icon.position().left});
                if ($icon.offset().top + $popup.height() <= $('#main').offset().top + $('#main').height()) {
                    // below the icon
                    $popup.css('top', $icon.position().top + $icon.outerHeight(true) + 3);
                } else {
                    $popup.css('bottom', $icon.parent().outerHeight() - $icon.position().top + 3);
                }
                $popup.removeClass('hide');
            } else {
                $popup.addClass('hide');
            }
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

            this.togglePopup();

            var cancelRename = function() {
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

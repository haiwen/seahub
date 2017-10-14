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
        mobileTemplate: _.template($('#repo-mobile-tmpl').html()), // for extra small devices (phones, less than 768px)
        renameTemplate: _.template($("#repo-rename-form-template").html()),
        transferTemplate: _.template($('#repo-transfer-form-tmpl').html()),
        addLabelTemplate: _.template($('#add-lib-label-form-tmpl').html()),

        events: {
            'click': 'clickItem',
            'click td:lt(2)': 'visitRepo',
            'click .repo-delete-btn': 'del',
            'click .repo-share-btn': 'share',
            'click .js-repo-rename': 'rename',
            'click .js-repo-transfer': 'transfer',
            'click .js-repo-change-password': 'changePassword',
            'click .js-popup-history-setting': 'popupHistorySetting',
            'click .js-popup-share-link-admin': 'popupShareLinkAdmin',
            'click .js-popup-folder-perm-admin': 'popupFolderPermAdmin',
            'click .js-repo-details': 'viewDetails',
            'click .js-add-label': 'addLabel'
        },

        initialize: function(options) {
            HLItemView.prototype.initialize.call(this);

            this.myReposView = options.myReposView;

            this.listenTo(this.model, "change", this.render);
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 48 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            var tmpl, dropdownOptions = {};
            if ($(window).width() >= 768) {
                tmpl = this.template;
            } else {
                tmpl = this.mobileTemplate;
                dropdownOptions = {'right': 0};
            }
            _.extend(obj, {
                'icon_url': icon_url,
                'icon_title': this.model.getIconTitle(),
                'can_generate_share_link': app.pageOptions.can_generate_share_link,
                'can_generate_upload_link': app.pageOptions.can_generate_upload_link
            });
            this.$el.html(tmpl(obj));
            this.dropdown = new DropdownView($.extend({
                el: this.$('.sf-dropdown')
            }, dropdownOptions));
            return this;
        },

        clickItem: function(e) {
            var target =  e.target || event.srcElement;
            if (this.$('td').is(target) &&
                $('#repo-details').css('right') == '0px') { // after `#repo-details` is shown
                this.viewDetails();
            }
        },

        visitRepo: function() {
            if ($(window).width() < 768) {
                location.href = this.$('.repo-name-span a').attr('href');
            }
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
                var err_msg;
                if (!new_name) {
                    err_msg = gettext("It is required.");
                    Common.feedback(err_msg, 'error');
                    return false;
                }

                if (new_name.indexOf('/') != -1) {
                    err_msg = gettext("Name should not include '/'.");
                    Common.feedback(err_msg, 'error');
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
                        err_msg = $.parseJSON(xhr.responseText).error||$.parseJSON(xhr.responseText).error_msg;
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
                width: '280px',
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

            return false;
        },

        popupHistorySetting: function() {
            var options = {
                'repo_name': this.model.get('name'),
                'repo_id': this.model.get('id'),
                'url_name': 'repo_history_limit'
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
        },

        viewDetails: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 48 : 24;
            var data = $.extend({}, obj, {
                icon_url: this.model.getIconUrl(icon_size),
                big_icon_url: this.model.getIconUrl()
            });
            var detailsView = this.myReposView.repoDetailsView;
            detailsView.show(data);

            // fetch other data
            $.ajax({
                url: Common.getUrl({
                    'name': 'repo_v2.1',
                    'repo_id': this.model.get('id')
                }),
                cache: false,
                dataType: 'json',
                success: function(data) {
                    detailsView.update({
                        'file_count': data.file_count
                    });
                },
                error: function() {
                    detailsView.update({'error': true});
                }
            });

            this.togglePopup(); // close the popup
            return false;
        },

        addLabel: function() {
            var _this = this;
            this.togglePopup(); // Close the popup

            var $form = $(this.addLabelTemplate());

            var $el = $('<div><span class="loading-icon loading-tip"></span></div>');
            $el.modal({focus:false, minWidth: 280});
            $('#simplemodal-container').css({'height':'auto'});

            $.ajax({
                // get all existing repo snapshot labels of the user
                url: Common.getUrl({'name': 'user_repo_labels'}),
                cache: false,
                dataType: 'json',
                success: function(data) { // data: ['xx', ...]
                    var s2_data = [];
                    for (var i = 0, len = data.length; i < len; i++) {
                        s2_data.push({
                            'id': data[i],
                            'text': data[i]
                        });
                    }
                    $('#simplemodal-data').html($form);
                    $('[name="labels"]', $form).select2({tags: s2_data});
                },
                error: function(xhr) {
                    var error_msg;
                    if (xhr.responseText) {
                        var parsed_resp = $.parseJSON(xhr.responseText);
                        error_msg = parsed_resp.error_msg || parsed_resp.detail;
                    } else {
                        error_msg = gettext("Failed. Please check the network.");
                    }
                    $('#simplemodal-data').html('<p class="error">' + error_msg + '</p>');
                }
            });

            $form.submit(function() {
                var $input = $('[name="labels"]', $form);
                var labels = $input.select2('val');
                var $error = $('.error', $form);
                var $submit = $('[type="submit"]', $form);

                if (labels.length == 0) {
                    $error.html(gettext("It is required.")).show();
                    return false;
                }

                Common.disableButton($submit);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'repo_labels'
                    }),
                    type: 'POST',
                    cache: false,
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: {
                        'repo_id': _this.model.get('id'),
                        'tag_names': labels.join(',')
                    },
                    success: function() {
                        var msg = gettext("Successfully added label(s) for library {placeholder}")
                            .replace('{placeholder}', _this.model.get('name'));
                        $.modal.close();
                        Common.feedback(msg, 'success');
                    },
                    error: function(xhr) {
                        var error_msg;
                        if (xhr.responseText) {
                            var parsed_resp = $.parseJSON(xhr.responseText);
                            error_msg = parsed_resp.error_msg || parsed_resp.detail;
                        } else {
                            error_msg = gettext("Failed. Please check the network.");
                        }
                        $error.html(error_msg).show();
                        Common.enableButton($submit);
                    }
                });

                return false;
            });

            return false;
        }

    });

    return RepoView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/group-manage-members',
    'app/views/widgets/popover'
], function($, _, Backbone, Common, ManageMembersView, PopoverView) {
    'use strict';

    var View = PopoverView.extend({
        id: 'group-settings',
        className: 'sf-popover',

        template:  _.template($('#group-settings-tmpl').html()),
        contentTemplate: _.template($('#group-settings-content-tmpl').html()),
        renameTemplate: _.template($('#group-rename-form-tmpl').html()),
        transferTemplate: _.template($('#group-transfer-form-tmpl').html()),
        importMembersTemplate: _.template($('#group-import-members-form-tmpl').html()),

        initialize: function(options) {
            PopoverView.prototype.initialize.call(this);

            this.groupView = options.groupView;
            this.render();
        },

        events: {
            'mouseenter .group-setting-item': 'highlightItem',
            'mouseleave .group-setting-item': 'rmHighlightItem',
            'click .group-setting-item': 'manageGroup'
        },

        render: function() {
            this.$el.html(this.template());
        },

        showContent: function() {
            this.$listContainer = this.$('.sf-popover-con');

            // the user's role in this group
            this.is_owner = false;
            this.is_admin = false;

            if (app.pageOptions.username == this.groupView.group.owner) {
                this.is_owner = true;
            } else if ($.inArray(app.pageOptions.username, this.groupView.group.admins) != -1) {
                this.is_admin = true;
            }
            this.$listContainer.html(this.contentTemplate({
                'is_owner': this.is_owner,
                'is_admin': this.is_admin,
                'wiki_enabled': this.groupView.group.wiki_enabled
            }));

            var $icon = $("#group-settings-icon");
            $icon.after(this.$el);
        },

        highlightItem: function(e) {
            $(e.currentTarget).addClass('hl');
        },

        rmHighlightItem: function(e) {
            $(e.currentTarget).removeClass('hl');
        },

        manageGroup: function(e) {
            switch($(e.currentTarget).data('op')) {
                case 'rename':
                    this.rename();
                    break;
                case 'transfer':
                    this.transfer();
                    break;
                case 'add-wiki':
                    this.toggleWiki('on');
                    break;
                case 'remove-wiki':
                    this.toggleWiki('off');
                    break;
                case 'import-members':
                    this.importMembers();
                    break;
                case 'manage-members':
                    this.manageMembers();
                    break;
                case 'dismiss':
                    this.dismiss();
                    break;
                case 'leave':
                    this.leave();
                    break;
            }
            this.hide();
            return false;
        },

        rename: function() {
            var _this = this;

            var $form = $(this.renameTemplate());
            $form.modal();
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $form.on('submit', function() {
                var new_name = $.trim($('[name="new_name"]', $(this)).val());
                if (!new_name || new_name == _this.groupView.group.name) {
                    return false;
                }
                var $submitBtn = $('[type="submit"]', $(this));
                Common.disableButton($submitBtn);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group',
                        'group_id': _this.groupView.group.id
                    }),
                    type: 'put',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: {
                        'name': new_name
                    },
                    success: function() {
                        $.modal.close();
                        _this.groupView.updateName(new_name);
                        app.ui.sideNavView.updateGroups();
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $('.error', $form).html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
        },

        transfer: function() {
            var _this = this;

            var $form = $(this.transferTemplate());
            $form.modal({focus:false, minWidth:268});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $('[name="email"]', $form).select2($.extend(
                Common.contactInputOptionsForSelect2(), {
                width: '268px',
                maximumSelectionSize: 1,
                placeholder: gettext("Search user or enter email and press Enter"), // to override 'placeholder' returned by `Common.conta...`
                formatSelectionTooBig: gettext("You cannot select any more choices")
            }));

            $form.on('submit', function() {
                var email = $.trim($('[name="email"]', $(this)).val());
                if (!email) {
                    return false;
                }
                if (email == _this.groupView.group.owner) {
                    return false;
                }

                var $submitBtn = $('[type="submit"]', $(this));
                Common.disableButton($submitBtn);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group',
                        'group_id': _this.groupView.group.id
                    }),
                    type: 'put',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: {
                        'owner': email
                    },
                    success: function(data) {
                        _this.groupView.group = data;
                        Common.feedback(gettext("Successfully transferred the group. You are now a normal member of the group."), 'success');
                        $.modal.close();
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $('.error', $form).html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
        },

        toggleWiki: function(status) {
            var _this = this;
            var wiki_enabled;

            if (status == 'on') {
                wiki_enabled = 'true';
            } else {
                wiki_enabled = 'false';
            }

            $.ajax({
                url: Common.getUrl({
                    'name': 'group',
                    'group_id': _this.groupView.group.id
                }),
                type: 'put',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'wiki_enabled': wiki_enabled
                },
                success: function(data) {
                    _this.hide();
                    _this.groupView.group = data;
                    _this.groupView.renderToolbar2({
                        'id': data.id,
                        'wiki_enabled': data.wiki_enabled
                    });
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    Common.feedback(error_msg, 'error');
                    _this.hide();
                }
            });
        },

        importMembers: function() {
            var _this = this;
            var $form = $(this.importMembersTemplate());
            $form.modal({focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $form.on('submit', function() {
                var $fileInput = $('[name=file]', $form)[0];
                var $error = $('.error', $form);
                if (!$fileInput.files.length) {
                    $error.html(gettext("Please choose a CSV file")).removeClass('hide');
                    return false;
                }

                var $submitBtn = $('[type="submit"]', $(this));
                Common.disableButton($submitBtn);

                var file = $fileInput.files[0];
                var formData = new FormData();
                formData.append('file', file);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group_import_members',
                        'group_id': _this.groupView.group.id
                    }),
                    type: 'post',
                    dataType: 'json',
                    data: formData,
                    processData: false,  // tell jQuery not to process the data
                    contentType: false, // tell jQuery not to set contentType
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data) {
                        if (data.failed.length > 0) {
                            var err_msg = '';
                            $(data.failed).each(function(index, item) {
                                err_msg += Common.HTMLescape(item.email) + ': ' + Common.HTMLescape(item.error_msg) + '<br />';
                            });
                            $error.html(err_msg).removeClass('hide');
                            Common.enableButton($submitBtn);
                        } else {
                            $.modal.close();
                            Common.feedback(gettext("Successfully imported."), 'success');
                        }
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $error.html(error_msg).removeClass('hide');
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
        },

        manageMembers: function() {
            new ManageMembersView({
                'group_id': this.groupView.group.id,
                'group_name': this.groupView.group.name,
                'is_owner': this.is_owner
            });
        },

        dismiss: function() {
            var _this = this;
            var title = gettext('Dismiss Group');
            var content = gettext('Really want to dismiss this group?');
            var yesCallback = function () {
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group',
                        'group_id': _this.groupView.group.id
                    }),
                    type: 'delete',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    success: function() {
                        app.ui.sideNavView.updateGroups();
                        app.router.navigate('groups/', {trigger: true});
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        Common.feedback(error_msg, 'error');
                    },
                    complete: function() {
                        $.modal.close();
                    }
                });
            };
            Common.showConfirm(title, content, yesCallback);
        },

        leave: function() {
            var _this = this;
            var title = gettext('Quit Group');
            var content = gettext('Are you sure you want to quit this group?');
            var yesCallback = function () {
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group_member',
                        'group_id': _this.groupView.group.id,
                        'email': encodeURIComponent(app.pageOptions.username)
                    }),
                    type: 'delete',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    success: function() {
                        app.ui.sideNavView.updateGroups();
                        app.router.navigate('groups/', {trigger: true});
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        Common.feedback(error_msg, 'error');
                    },
                    complete: function() {
                        $.modal.close();
                    }
                });
            };
            Common.showConfirm(title, content, yesCallback);
        }

    });

    return View;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/group-manage-members'
], function($, _, Backbone, Common, ManageMembersView) {
    'use strict';

    var View = Backbone.View.extend({
        el: '#group-settings',

        template: _.template($('#group-settings-tmpl').html()),
        renameTemplate: _.template($('#group-rename-form-tmpl').html()),
        transferTemplate: _.template($('#group-transfer-form-tmpl').html()),
        importMembersTemplate: _.template($('#group-import-members-form-tmpl').html()),

        initialize: function(options) {
            this.groupView = options.groupView;

            // group basic info
            this.group = {};

            this.$loadingTip = this.$('.loading-tip');
            this.$listContainer = $('#group-setting-con');   
            this.$error = this.$('.error');

            var _this = this;
            $(window).resize(function() {
                _this.setConMaxHeight();
            });
            $(document).click(function(e) {
                var target = e.target || event.srcElement;
                var $popup = _this.$el,
                    $popup_switch = $('#group-settings-icon');

                if ($('#group-settings:visible').length &&
                    !$popup.is(target) &&
                    !$popup.find('*').is(target) &&
                    !$popup_switch.is(target)) {
                    _this.hide();
                }   
            });
        },

        events: {
            'click .close': 'hide',
            'mouseenter .group-setting-item': 'highlightItem',
            'mouseleave .group-setting-item': 'rmHighlightItem',
            'click .group-setting-item': 'manageGroup'
        },

        render: function() {
            this.$error.hide();
            this.$listContainer.hide();
            this.$loadingTip.show();

            // the user's role in this group
            this.is_owner = false,
            this.is_admin = false;

            var _this = this;
            $.ajax({
                url: Common.getUrl({
                    'name': 'group',
                    'group_id': this.group.id
                }), 
                cache: false,
                dataType: 'json',
                success: function(data) {
                    _this.group = data; // {id, name, owner, created_at, avatar_url, admins}

                    var username = app.pageOptions.username;
                    if (username == _this.group.owner) {
                        _this.is_owner = true;
                    } else if ($.inArray(username, _this.group.admins) != -1) {
                        _this.is_admin = true;
                    }
                    _this.$listContainer.html(_this.template({
                        'is_owner': _this.is_owner,
                        'is_admin': _this.is_admin
                    })).show();
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = gettext('Error');
                    } else {
                        err_msg = gettext("Please check the network.");
                    }   
                    _this.$error.html(err_msg).show();
                },
                complete: function() {
                    _this.$loadingTip.hide();
                }
            }); 
        },

        // set max-height for '.popover-con'
        setConMaxHeight: function() {
            this.$('.popover-con').css({'max-height': $(window).height() - this.$el.offset().top - this.$('.popover-hd').outerHeight(true) - 2}); // 2: top, bottom border width of $el
        },

        show: function(options) {
            this.group.id = options.group_id;
            this.$el.show();
            this.setConMaxHeight();
            this.render();
            app.router.navigate('group/' + this.group.id + '/settings/');
        },

        hide: function() {
            this.$el.hide();
            app.router.navigate('group/' + this.group.id + '/');
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
        },

        rename: function() {
            var _this = this;

            var $form = $(this.renameTemplate());
            $form.modal({focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $form.submit(function() {
                var new_name = $.trim($('[name="new_name"]', $(this)).val());    
                if (!new_name || new_name == _this.group.name) {
                    return false;
                }
                var $submitBtn = $('[type="submit"]', $(this));
                Common.disableButton($submitBtn);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group', 
                        'group_id': _this.group.id
                    }),
                    type: 'put',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken, 
                    data: {
                        'name': new_name
                    },
                    success: function() {
                        $.modal.close();
                        app.ui.sideNavView.updateGroups();
                        _this.groupView.renderGroupTop();
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

        transfer: function() {
            var _this = this;

            var $form = $(this.transferTemplate());
            $form.modal({focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $('[name="email"]', $form).select2($.extend(
                Common.contactInputOptionsForSelect2(), {
                width: '268px',
                maximumSelectionSize: 1,
                placeholder: gettext("Search user or enter email"), // to override 'placeholder' returned by `Common.conta...`
                formatSelectionTooBig: gettext("You cannot select any more choices")
            }));

            $form.submit(function() {
                var email = $.trim($('[name="email"]', $(this)).val());
                if (!email) {
                    return false;
                }
                if (email == _this.group.owner) {
                    return false;
                }

                var $submitBtn = $('[type="submit"]', $(this));
                Common.disableButton($submitBtn);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group', 
                        'group_id': _this.group.id
                    }),
                    type: 'put',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken, 
                    data: {
                        'owner': email
                    },
                    success: function() {
                        // after the transfer, the former owner becomes a common admin of the group.
                        $.modal.close();
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

        // TODO: finish it after the backend py is done.
        importMembers: function() {
            var _this = this;
            var $form = $(this.importMembersTemplate());
            $form.modal({focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $form.submit(function() {
                var $fileInput = $('[name=file]', $form)[0];
                if (!$fileInput.files.length) {
                    $('.error', $form).removeClass('hide');
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
                        'group_id': _this.group.id 
                    }),
                    type: 'post',
                    dataType: 'json',
                    data: formData,
                    processData: false,  // tell jQuery not to process the data
                    contentType: false, // tell jQuery not to set contentType
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data) {
                    },
                    error: function () {
                    }
                });
                return false;
            });
        },

        manageMembers: function() {
            new ManageMembersView({
                'group_id': this.group.id,
                'group_name': this.group.name,
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
                        'group_id': _this.group.id
                    }),
                    type: 'delete',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken, 
                    success: function() {
                        app.ui.sideNavView.updateGroups();
                        app.router.navigate('groups/', {trigger: true});
                    },
                    error: function(xhr) {
                        var error_msg;
                        if (xhr.responseText) {
                            error_msg = $.parseJSON(xhr.responseText).error_msg;
                        } else {
                            error_msg = gettext("Failed. Please check the network.");
                        }
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
                        'group_id': _this.group.id,
                        'email': encodeURIComponent(app.pageOptions.username),
                    }),
                    type: 'delete',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    success: function() {
                        app.ui.sideNavView.updateGroups();
                        app.router.navigate('groups/', {trigger: true});
                    },
                    error: function(xhr) {
                        var err_msg;
                        if (xhr.responseText) {
                            err_msg = $.parseJSON(xhr.responseText).error_msg;
                        } else {
                            err_msg = gettext("Failed. Please check the network.");
                        }
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

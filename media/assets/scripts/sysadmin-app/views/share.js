define([
    'jquery',
    'jquery.ui', /* for tabs */
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/folder-share-item'
], function($, jQueryUI, _, Backbone, Common, FolderShareItemView) {
    'use strict';

    var SharePopupView = Backbone.View.extend({
        tagName: 'div',
        id: 'share-popup',
        template: _.template($('#share-popup-tmpl').html()),

        initialize: function(options) {
            this.repo_id = options.repo_id;
            this.repo_name = options.repo_name;

            this.render();

            this.$el.modal({focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.$("#share-tabs").tabs();

            this.dirUserSharePanelInit();
            this.dirGroupSharePanelInit();

            var _this = this;
            $(document).on('click', function(e) {
                var target = e.target || event.srcElement;
                if (!_this.$('.perm-edit-icon, .perm-toggle-select').is(target)) {
                    _this.$('.perm').removeClass('hide');
                    _this.$('.perm-toggle-select').addClass('hide');
                }
            });
        },

        render: function () {
            this.$el.html(this.template({
                title: gettext("Share {placeholder}")
                    .replace('{placeholder}', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(this.repo_name) + '">' + Common.HTMLescape(this.repo_name) + '</span>'),
                repo_id: this.repo_id,
                is_pro: app.pageOptions.is_pro
            }));

            return this;
        },

        events: {
            'click #add-dir-user-share-item .submit': 'dirUserShare',
            'click #add-dir-group-share-item .submit': 'dirGroupShare'
        },

        dirUserSharePanelInit: function() {
            var $dir_user_share_panel = this.$('#dir-user-share');

            // show existing items
            var $add_item = this.$('#add-dir-user-share-item');
            var repo_id = this.repo_id;

            $('[name="emails"]', $dir_user_share_panel).select2($.extend({
                //width: '292px' // the container will copy class 'w100' from the original element to get width
            }, Common.contactInputOptionsForSelect2()));

            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'admin_shares'}),
                'data': {
                    'repo_id': repo_id,
                    'share_type': 'user'
                },
                'after_op_success': function(data) {
                    $(data).each(function(index, item) {
                        var new_item = new FolderShareItemView({
                            'repo_id': repo_id,
                            'item_data': {
                                "user_email": item.user_email,
                                "user_name": item.user_name,
                                "permission": item.permission,
                                "is_admin": item.is_admin, 
                                "for_user": true
                            }
                        });
                        $add_item.after(new_item.el);
                    });
                }
            });

            $dir_user_share_panel.removeClass('hide');
            this.$('.loading-tip').hide();
        },

        dirGroupSharePanelInit: function() {
            var $dir_group_share_panel = this.$('#dir-group-share');

            // show existing items
            var $add_item = this.$('#add-dir-group-share-item');
            var repo_id = this.repo_id;

            $('[name="groups"]', $dir_group_share_panel).select2($.extend({
                //width: '292px' // the container will copy class 'w100' from the original element to get width
            }, Common.groupInputOptionsForSelect2()));

            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'admin_shares'}),
                'data': {
                    'repo_id': repo_id,
                    'share_type': 'group'
                },
                'after_op_success': function(data) {
                    $(data).each(function(index, item) {
                        var new_item = new FolderShareItemView({
                            'repo_id': repo_id,
                            'item_data': {
                                "group_id": item.group_id,
                                "group_name": item.group_name,
                                "permission": item.permission,
                                "is_admin": item.is_admin,
                                'for_user': false
                            }
                        });
                        $add_item.after(new_item.el);
                    });
                }
            });

            $dir_group_share_panel.removeClass('hide');
            this.$('.loading-tip').hide();
        },

        dirUserShare: function () {
            var $user_share_item = this.$('#add-dir-user-share-item');

            var $emails_input = $('[name="emails"]', $user_share_item),
                emails = $emails_input.val(); // string

            var $perm = $('[name="permission"]', $user_share_item),
                perm = $perm.val();

            if (!emails || !perm) {
                return false;
            }

            var repo_id = this.repo_id;
            var $submitBtn = $('[type="submit"]', $user_share_item);
            var $error = $('#dir-user-share .error');

            Common.disableButton($submitBtn);
            $.ajax({
                url: Common.getUrl({name: 'admin_shares'}),
                dataType: 'json',
                method: 'POST',
                beforeSend: Common.prepareCSRFToken,
                traditional: true,
                data: {
                    'repo_id': repo_id,
                    'share_type': 'user',
                    'share_to': emails.split(','),
                    'permission': perm
                },
                success: function(data) {
                    if (data.success.length > 0) {
                        $(data.success).each(function(index, item) {
                            var new_item = new FolderShareItemView({
                                'repo_id': repo_id,
                                'item_data': {
                                    "user_email": item.user_email,
                                    "user_name": item.user_name,
                                    "permission": item.permission,
                                    'is_admin': item.is_admin,
                                    'for_user': true
                                }
                            });
                            $user_share_item.after(new_item.el);
                        });
                        $emails_input.select2("val", "");
                        $('option', $perm).prop('selected', false);
                        $('[value="rw"]', $perm).prop('selected', true);
                        $error.addClass('hide');
                    }
                    if (data.failed.length > 0) {
                        var err_msg = '';
                        $(data.failed).each(function(index, item) {
                            err_msg += Common.HTMLescape(item.user_email) + ': ' + Common.HTMLescape(item.error_msg) + '<br />';
                        });
                        $error.html(err_msg).removeClass('hide');
                    }
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    $error.html(error_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submitBtn);
                }
            });
        },

        dirGroupShare: function () {
            var $group_share_item= this.$('#add-dir-group-share-item');

            var $groups_input = $('[name="groups"]', $group_share_item),
                groups = $groups_input.val(); // string

            var $perm = $('[name="permission"]', $group_share_item),
                perm = $perm.val();

            if (!groups || !perm) {
                return false;
            }

            var repo_id = this.repo_id;
            var $error = $('#dir-group-share .error');
            var $submitBtn = $('[type="submit"]', $group_share_item);

            Common.disableButton($submitBtn);

            $.ajax({
                url: Common.getUrl({name: 'admin_shares'}),
                dataType: 'json',
                method: 'POST',
                beforeSend: Common.prepareCSRFToken,
                traditional: true,
                data: {
                    'repo_id': repo_id,
                    'share_type': 'group',
                    'share_to': groups.split(','),
                    'permission': perm
                },
                success: function(data) {
                    if (data.success.length > 0) {
                        $(data.success).each(function(index, item) {
                            var new_item = new FolderShareItemView({
                                'repo_id': repo_id,
                                'item_data': {
                                    "group_id": item.group_id,
                                    "group_name": item.group_name,
                                    "permission": item.permission,
                                    'is_admin': item.is_admin,
                                    'for_user': false
                                }
                            });
                            $group_share_item.after(new_item.el);
                        });
                        $groups_input.select2("val", "");
                        $('option', $perm).prop('selected', false);
                        $('[value="rw"]', $perm).prop('selected', true);
                        $error.addClass('hide');
                    }
                    if (data.failed.length > 0) {
                        var err_msg = '';
                        $(data.failed).each(function(index, item) {
                            err_msg += Common.HTMLescape(item.group_id) + ': ' + Common.HTMLescape(item.error_msg) + '<br />';
                        });
                        $error.html(err_msg).removeClass('hide');
                    }
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    $error.html(err_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submitBtn);
                }
            });
        }

    });

    return SharePopupView;
});

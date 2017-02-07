define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/collections/repo-user-folder-perm',
    'app/collections/repo-group-folder-perm',
    'app/views/repo-folder-perm-item'
], function($, _, Backbone, Common, FileTree, UserFolderPerm, GroupFolderPerm, ItemView) {
    'use strict';

    var View = Backbone.View.extend({

        id: 'repo-folder-perm-popup',
        template: _.template($('#repo-folder-perm-admin-dialog-tmpl').html()),

        initialize: function(options) {
            this.repo_name = options.repo_name;
            this.repo_id = options.repo_id;

            this.render();
            this.$('.op-target').css({'max-width':280}); // for long repo name
            if ($(window).width() < 768) {
                this.$el.css({
                    'width': $(window).width() - 50,
                    'height': $(window).height() - 50,
                    'overflow': 'auto'
                });
            }
            this.$el.modal({
                focus: false,
                onClose: function() {
                    $(document).off('click', hideItemEdit);
                    $.modal.close();
                }
            });
            if ($(window).width() >= 768) {
                $("#simplemodal-container").css({
                    'width':'auto',
                    'height':'auto'
                });
            }
            this.$('.js-tabs').tabs();

            this.userPerm = new UserFolderPerm({repo_id: this.repo_id});
            this.userPerm.perm_type = 'user';
            this.$userPermPanel = this.$('#js-repo-user-folder-perm .js-folder-perm-content');

            this.groupPerm = new GroupFolderPerm({repo_id: this.repo_id});
            this.groupPerm.perm_type = 'group';
            this.$groupPermPanel = this.$('#js-repo-group-folder-perm .js-folder-perm-content');

            this.renderPanel({
                collection: this.userPerm,
                $panel: this.$userPermPanel
            });
            this.renderPanel({
                collection: this.groupPerm,
                $panel: this.$groupPermPanel
            });

            // click to hide 'perm edit'
            var _this = this;
            var hideItemEdit = function(e) {
                var target = e.target || event.srcElement;
                var $el = _this.$('.perm-toggle-select:visible');
                var $td = $el.parent();
                if ($el.length &&
                    !$el.is(target) &&
                    !$el.find('*').is(target) &&
                    !$td.find('.edit-icon').is(target)) {
                    $el.hide();
                    $td.find('.cur-perm, .edit-icon').show();
                }
            };
            $(document).click(hideItemEdit);
        },

        render: function() {
            this.$el.html(this.template({
                title: gettext("{placeholder} Folder Permission")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(this.repo_name) + '">'
                    + Common.HTMLescape(this.repo_name) + '</span>')
            }));

            return this;
        },

        renderPanel: function(options) {
            var collection = options.collection;
            var $panel = options.$panel;
            var $loadingTip = $('.loading-tip', $panel);
            var $error = $('.error', $panel);

            if (collection.perm_type == 'user') {
                $('[name="emails"]', $panel).select2($.extend(
                    Common.contactInputOptionsForSelect2(), {
                        placeholder: gettext("Search user or enter email and press Enter") // to override 'placeholder' returned by `Common.conta...`
                    }));
            } else {
                var groups = app.pageOptions.groups || [];
                var g_opts = '';
                for (var i = 0, len = groups.length; i < len; i++) {
                    g_opts += '<option value="' + groups[i].id + '" data-index="' + i + '">' + groups[i].name + '</option>';
                }
                $('[name="groups"]', $panel).html(g_opts).select2({
                    placeholder: gettext("Select a group"),
                    maximumSelectionSize: 1,
                    formatSelectionTooBig: gettext("You can only select 1 item"),
                    escapeMarkup: function(m) { return m; }
                });
            }

            // show existing items
            this.listenTo(collection, 'add', this.addItem);
            collection.fetch({
                cache: false,
                success: function(collection, response, opts) {
                    $loadingTip.hide();
                },
                error: function(collection, response, opts) {
                    $loadingTip.hide();
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = $.parseJSON(response.responseText).error_msg;
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $error.html(err_msg).show();
                }
            });
        },

        addItem: function(model, collection, options) {
            var perm_type = collection.perm_type;
            var $panel = perm_type == 'user' ? this.$userPermPanel : this.$groupPermPanel;
            var for_user = perm_type == 'user' ? true : false;
            var encoded_path = Common.encodePath(model.get('folder_path'));
            var view = new ItemView({
                item_data: $.extend(model.toJSON(), {'for_user': for_user, 'show_folder_path': true, 'encoded_path': encoded_path})
            });

            if (options.prepend) {
                $('[name="folder_path"]', $panel).closest('tr').after(view.render().el);
            } else {
                $('tbody', $panel).append(view.render().el);
            }
        },

        events: {
            'click .js-add-folder': 'showFolderSelectForm',
            'click .js-folder-select-submit': 'addFolder',
            'click .js-folder-select-cancel': 'cancelFolderSelect',

            'click .js-user-perm-add-submit': 'addPerm',
            'click .js-group-perm-add-submit': 'addPerm'
        },

        showFolderSelectForm: function(e) {
            var $icon = $(e.currentTarget);
            var $permContent = $icon.closest('.js-folder-perm-content').slideUp();
            var $form = $('.js-folder-select-form', $permContent.parent()).slideDown();

            var $jstreeContainer = $('.js-jtree-container', $form);
            if ($.jstree.reference($jstreeContainer)) { // null or {...}
                return;
            }
            FileTree.renderTreeForPath({
                $form: $form,
                $container: $jstreeContainer,
                repo_id: this.repo_id,
                repo_name: this.repo_name,
                path: '/'
            });
        },

        addFolder: function(e) {
            var $submitBtn = $(e.currentTarget);

            var $form = $submitBtn.closest('form');
            var $input = $('[name=dst_path]', $form);
            var path = $input.val();
            var $error = $('.error', $form);
            if (!path) {
                $error.html(gettext("Please click and choose a directory.")).removeClass('hide');
                return false;
            }
            $form.slideUp();

            // clean the state
            $.jstree.reference($('.js-jtree-container', $form)).deselect_all();
            $('[name=dst_path]', $form).val('');
            $error.hide();

            var $folderPerm = $('.js-folder-perm-content', $form.parent()).slideDown();
            $('[name=folder_path]', $folderPerm).val(path);

            return false;
        },

        cancelFolderSelect: function(e) {
            var $cancelBtn = $(e.currentTarget);
            var $form = $cancelBtn.closest('form').slideUp();
            $('.js-folder-perm-content', $form.parent()).slideDown();

            // clean the state
            var theTree = $.jstree.reference($('.js-jtree-container', $form));
            if (theTree.get_selected().length > 0) { // if select any node
                theTree.deselect_all();
            }
        },

        addPerm: function(e) {
            var $submit = $(e.currentTarget);
            var $panel, $email_or_group, url, post_data, for_user;

            if ($submit.hasClass('js-user-perm-add-submit')) {
                for_user = true;
                $panel = this.$userPermPanel;
                url = Common.getUrl({name: 'repo_user_folder_perm', repo_id: this.repo_id});

                var $email_or_group = $('[name="emails"]', $panel);
                var email = $email_or_group.val();
                if (!email) {
                    return false;
                }

                post_data = {'user_email': email.split(',')};


            } else {
                for_user = false;
                $panel = this.$groupPermPanel;
                url = Common.getUrl({name: 'repo_group_folder_perm', repo_id: this.repo_id});

                var $email_or_group = $('[name="groups"]', $panel);
                var group_val = $email_or_group.val().join(',');
                if (!group_val) {
                    return false;
                }

                post_data = {'group_id': group_val.split(',')};
            }

            var $path = $('[name="folder_path"]', $panel);
            var $perm = $('[name="permission"]', $panel);
            var perm = $perm.val();
            var path = $path.val();

            if (!perm || !path) {
                return false;
            }

            $.extend(post_data, {'folder_path': path, 'permission': perm});

            var $error = $('.error', $panel);
            Common.disableButton($submit);

            $.ajax({
                url: url,
                dataType: 'json',
                method: 'POST',
                beforeSend: Common.prepareCSRFToken,
                traditional: true,
                data: post_data,
                success: function(data) {
                    if (data.success.length > 0) {
                        $(data.success).each(function(index, item) {
                            var encoded_path = Common.encodePath(item.folder_path);
                            var perm_item = new ItemView({
                                item_data: $.extend(item, {'for_user': for_user, 'show_folder_path': true, 'encoded_path': encoded_path})
                            });
                            $('[name="folder_path"]', $panel).closest('tr').after(perm_item.el);
                        });

                        $email_or_group.select2('val', '');
                        $path.val('');
                        $('[value="rw"]', $perm).attr('selected', 'selected');
                        $('[value="r"]', $perm).removeAttr('selected');
                        $error.addClass('hide');
                    }
                    if (data.failed.length > 0) {
                        var error_msg = '';
                        $(data.failed).each(function(index, item) {
                            error_msg += Common.HTMLescape(item.user_email || item.group_id) + ': ' + Common.HTMLescape(item.error_msg) + '<br />';
                        });
                        $error.html(error_msg).removeClass('hide');
                    }
                },
                error: function(xhr) {
                    var error_msg;
                    if (xhr.responseText) {
                        error_msg = $.parseJSON(xhr.responseText).error_msg;
                    } else {
                        error_msg = gettext("Failed. Please check the network.");
                    }
                    $error.html(error_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submit);
                }
            });
        }

    });

    return View;
});

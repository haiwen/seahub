define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/collections/repo-user-folder-perm',
    'app/collections/repo-group-folder-perm',
    'app/views/repo-folder-perm'
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
            this.$el.modal({
                focus: false,
                onClose: function() {
                    $(document).off('click', hideItemEdit);
                    $.modal.close();
                }
            });
            $("#simplemodal-container").css({
                'width':'auto',
                'height':'auto'
            });
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
                        placeholder: gettext("Search user or enter email and press Enter"), // to override 'placeholder' returned by `Common.conta...`
                        maximumSelectionSize: 1,
                        formatSelectionTooBig: gettext("You can only select 1 item")
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
            var view = new ItemView({
                model: model,
                repo_id: this.repo_id,
                perm_type: perm_type,
                $error: $('.error', $panel)
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

            'click .js-user-perm-add-submit': 'addUserPerm',
            'click .js-group-perm-add-submit': 'addGroupPerm'
        },

        showFolderSelectForm: function(e) {
            var $icon = $(e.currentTarget);
            var $permContent = $icon.closest('.js-folder-perm-content').slideUp();

            var $form = $('.js-folder-select-form', $permContent.parent()).slideDown();
            var $jstreeContainer = $('.js-jtree-container', $form);
            /*
            var repo_data = FileTree.formatRepoData([{
                'id': this.repo_id,
                'name': this.repo_name
            }]);
            FileTree.renderDirTree($jstreeContainer, $form, repo_data);
            */
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
            var path = $('[name=dst_path]', $form).val();
            if (!path) {
                $('.error', $form).html(gettext("Please click and choose a directory.")).removeClass('hide');
                return false;
            }
            $form.slideUp();
            // destroy the jstree instance.
            // attention: because of `destroy()`, the $jstreeContainer's class names should not include string 'jstree', e.g. '.js-jstree-container' is not ok. 
            $.jstree._reference($('.js-jtree-container', $form)).destroy();

            var $folderPerm = $('.js-folder-perm-content', $form.parent()).slideDown();
            $('[name=folder_path]', $folderPerm).val(path);

            return false;
        },

        cancelFolderSelect: function(e) {
            var $cancelBtn = $(e.currentTarget);
            var $form = $cancelBtn.closest('form').slideUp();
            // destroy the jstree instance.
            $.jstree._reference($('.js-jtree-container', $form)).destroy();
            $('.js-folder-perm-content', $form.parent()).slideDown();
        },

        addUserPerm: function(e) {
            var $panel = this.$userPermPanel;
            var $error = $('.error', $panel);
            var $email = $('[name="emails"]', $panel);
            var $path = $('[name="folder_path"]', $panel);

            var email = $email.val();
            var path = $path.val();

            if (!email || !path) {
                return false;
            }

            var $perm = $('[name="permission"]', $panel);
            var perm = $perm.val();
            var $submit = $(e.currentTarget);
            Common.disableButton($submit);

            this.userPerm.create({
                'user_email': email,
                'folder_path': path,
                'permission': perm
            }, {
                wait: true,
                prepend: true,
                success: function() {
                    $email.select2('val', '');
                    $path.val('');
                    $('[value="rw"]', $perm).attr('selected', 'selected');
                    $('[value="r"]', $perm).removeAttr('selected');
                    $error.addClass('hide');
                },
                error: function(collection, response, options) {
                    var err_msg;
                    if (response.responseText) {
                        err_msg = response.responseJSON.error_msg;
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $error.html(err_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submit);
                }
            });
        },

        addGroupPerm: function(e) {
            var $panel = this.$groupPermPanel;
            var $error = $('.error', $panel);
            var $group = $('[name="groups"]', $panel);
            var $path = $('[name="folder_path"]', $panel);

            var group_val = $group.val(); // null or [group_id]
            var path = $path.val();

            if (!group_val || !path) {
                return false;
            }

            var $perm = $('[name="permission"]', $panel);
            var perm = $perm.val();
            var $submit = $(e.currentTarget);
            Common.disableButton($submit);

            this.groupPerm.create({
                'group_id': group_val[0],
                'folder_path': path,
                'permission': perm
            }, {
                wait: true,
                prepend: true,
                success: function() {
                    $group.select2('val', '');
                    $path.val('');
                    $('[value="rw"]', $perm).attr('selected', 'selected');
                    $('[value="r"]', $perm).removeAttr('selected');
                    $error.addClass('hide');
                },
                error: function(collection, response, options) {
                    var err_msg;
                    if (response.responseText) {
                        err_msg = response.responseJSON.error_msg;
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $error.html(err_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submit);
                }
            });
        }

    });

    return View;
});

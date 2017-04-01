define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/views/share',
    'app/views/dialogs/dirent-mvcp',
    'app/views/folder-perm',
    'app/views/widgets/hl-item-view',
    'app/views/widgets/dropdown'
], function($, _, Backbone, Common, FileTree, ShareView, DirentMvcpDialog,
    FolderPermView, HLItemView, DropdownView) {
    'use strict';

    var DirentView = HLItemView.extend({
        tagName: 'tr',
        attributes: {
            draggable: 'true'
        },

        fileTemplate: _.template($('#dirent-file-tmpl').html()),
        fileMobileTemplate: _.template($('#dirent-file-mobile-tmpl').html()),
        dirTemplate: _.template($('#dirent-dir-tmpl').html()),
        dirMobileTemplate: _.template($('#dirent-dir-mobile-tmpl').html()),
        renameTemplate: _.template($("#rename-form-template").html()),

        initialize: function(options) {
            HLItemView.prototype.initialize.call(this);

            this.dirView = options.dirView;
            this.dir = this.dirView.dir;

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, 'remove', this.remove); // for multi dirents: delete, mv
        },

        render: function() {
            var dir = this.dir;
            var dirent_path = Common.pathJoin([dir.path, this.model.get('obj_name')]);
            var is_pro = app.pageOptions.is_pro;
            var file_audit_enabled = app.pageOptions.file_audit_enabled;
            var file_icon_size = Common.isHiDPI() ? 48 : 24;
            var template;
            if (this.model.get('is_dir')) {
                template = $(window).width() < 768 ? this.dirMobileTemplate : this.dirTemplate;
            } else {
                template = $(window).width() < 768 ? this.fileMobileTemplate : this.fileTemplate;
            }

            this.$el.html(template({
                dirent: this.model.attributes,
                dirent_path: dirent_path,
                encoded_path: Common.encodePath(dirent_path),
                icon_url: this.model.getIconUrl(file_icon_size),
                url: this.model.getWebUrl(),
                download_url: this.model.getDownloadUrl(),
                category: dir.category,
                repo_id: dir.repo_id,
                is_repo_owner: dir.is_repo_owner,
                is_virtual: dir.is_virtual,
                has_been_shared_out: dir.has_been_shared_out,
                can_generate_share_link: app.pageOptions.can_generate_share_link,
                can_generate_upload_link: app.pageOptions.can_generate_upload_link,
                is_pro: is_pro,
                file_audit_enabled: file_audit_enabled,
                repo_encrypted: dir.encrypted
            }));
            this.$('.file-locked-icon').attr('title', gettext("locked by {placeholder}").replace('{placeholder}', this.model.get('lock_owner_name')));
            this.dropdown = new DropdownView({
                el: this.$('.sf-dropdown'),
                right: '0'
            });

            // for image files
            this.$('.img-name-link').magnificPopup(this.dirView.magnificPopupOptions);

            return this;
        },

        events: {
            'click .select': 'select',
            'click .file-star': 'starItem',
            'click .dirent-name': 'visitDirent',
            'click .img-name-link': 'viewImageWithPopup',

            // mv by 'drag & drop'
            'dragstart': 'itemDragstart',
            'dragover': 'itemDragover',
            'dragenter': 'itemDragenter',
            'dragleave': 'itemDragleave',
            'drop': 'itemDrop',

            'click .download-dir': 'downloadDir',
            'click .share': 'share',
            'click .delete': 'del', // 'delete' is a preserve word
            'click .rename': 'rename',
            'click .mv': 'mvcp',
            'click .cp': 'mvcp',
            'click .set-folder-permission': 'setFolderPerm',
            'click .lock-file': 'lockFile',
            'click .unlock-file': 'unlockFile',
            'click .open-via-client': 'open_via_client'
        },

        _hideMenu: function() {
            this.dropdown.hide();
        },

        select: function () {
            var $checkbox = this.$('[type=checkbox]');
            if ($checkbox.prop('checked')) {
                this.model.set({'selected':true}, {silent:true}); // do not trigger the 'change' event.
            } else {
                this.model.set({'selected':false}, {silent:true});
            }

            var dirView = this.dirView;
            var $dirents_op = dirView.$('#multi-dirents-op');
            var $toggle_all_checkbox = dirView.$('th [type=checkbox]');
            var checked_num = 0;
            dirView.$('tr:gt(0) [type=checkbox]').each(function() {
                if ($(this).prop('checked')) {
                    checked_num += 1;
                }
            });

            var $curDirOps = dirView.$('#cur-dir-ops');

            if (checked_num > 0) {
                $dirents_op.css({'display':'inline-block'});
                $curDirOps.hide();
            } else {
                $dirents_op.hide();
                $curDirOps.show();
            }
            dirView.updateDirOpBarUI();
            if (checked_num == dirView.$('tr:gt(0)').length) {
                $toggle_all_checkbox.prop('checked', true);
            } else {
                $toggle_all_checkbox.prop('checked', false);
            }
        },

        itemDragstart: function(e) {
            if (this.model.get('perm') != 'rw') {
                return false;
            }
            var ev = e.originalEvent;
            ev.dataTransfer.setData('text/cid', this.model.cid);
            ev.dataTransfer.setData('text/is_dir', this.model.get('is_dir'));
            ev.dataTransfer.setData('text/plain', this.model.get('obj_name'));
            ev.dataTransfer.effectAllowed = 'move';
            // use the file/dir icon as drag image
            ev.dataTransfer.setDragImage(this.$('.dirent-icon img')[0], 0, 0);
        },

        itemDragover: function(e) {
            if (this.model.get('perm') != 'rw') {
                return false;
            }
            if (!this.model.get('is_dir')) {
                return false;
            }
            var ev = e.originalEvent;
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
        },

        itemDragenter: function(e) {
            if (this.model.get('perm') != 'rw') {
                return false;
            }
            if (!this.model.get('is_dir')) {
                return false;
            }
            this.$el.css({'background-color':'#f8f8f8'});
        },

        itemDragleave: function(e) {
            if (this.model.get('perm') != 'rw') {
                return false;
            }
            if (!this.model.get('is_dir')) {
                return false;
            }
            this.$el.removeAttr('style');
        },

        itemDrop: function(e) {
            if (this.model.get('perm') != 'rw') {
                return false;
            }
            if (!this.model.get('is_dir')) {
                return false;
            }
            this.$el.removeAttr('style');

            var ev = e.originalEvent;
            ev.preventDefault();

            var cid = ev.dataTransfer.getData('text/cid');
            var is_dir = ev.dataTransfer.getData('text/is_dir'); // the value is string: 'true' or 'undefined'
            var obj_name = ev.dataTransfer.getData('text/plain');

            if (is_dir == 'true' && obj_name == this.model.get('obj_name')) {
                // can't move a directory to itself
                return false;
            }

            var dir = this.dir;
            var repo_id = dir.repo_id;
            var path = dir.path;
            var dirent_path = Common.pathJoin([path, this.model.get('obj_name')]);
            $.ajax({
                url: Common.getUrl({'name': 'copy_move_task'}),
                type: 'post',
                cache: false,
                dataType: 'json',
                data: {
                    'src_repo_id': repo_id,
                    'src_parent_dir': path,
                    'src_dirent_name': obj_name,
                    'dst_repo_id': repo_id,
                    'dst_parent_dir': dirent_path,
                    'operation': 'move',
                    'dirent_type': is_dir == 'true' ? 'dir' : 'file'
                },
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    var msg = gettext("Successfully moved %(name)s")
                        .replace('%(name)s', obj_name);
                    Common.feedback(msg, 'success');
                    dir.remove(cid);
                },
                error: function(xhr) {
                    if (xhr.responseText) {
                        Common.feedback($.parseJSON(xhr.responseText).error);
                    } else {
                        Common.feedback(gettext("Please check the network."), 'error');
                    }
                }
            });
        },

        downloadDir: function() {
            var dir = this.dirView.dir;
            var obj_name = this.model.get('obj_name');
            Common.zipDownload(dir.repo_id, dir.path, obj_name);
            return false;
        },

        starItem: function() {
            var _this = this;
            var dir = this.dirView.dir;
            var filePath = Common.pathJoin([dir.path, this.model.get('obj_name')]);
            var data = {
                'repo_id': dir.repo_id,
                'path': filePath
            };

            if (this.model.get('is_dir')) {
                data['is_dir'] = 'true';
            } else {
                data['is_dir'] = 'false';
            }

            if (this.model.get('starred')) {
                $.ajax({
                    url: Common.getUrl({'name':'starred_items'}),
                    type: 'DELETE',
                    cache: false,
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: data,
                    success: function() {
                        _this.model.set({'starred':false});
                    },
                    error: function(xhr) {
                        Common.ajaxErrorHandler(xhr);
                    }
                });
            } else {
                $.ajax({
                    url: Common.getUrl({'name':'starred_items'}),
                    type: 'POST',
                    cache: false,
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: data,
                    success: function() {
                        _this.model.set({'starred':true});
                    },
                    error: function(xhr) {
                        Common.ajaxErrorHandler(xhr);
                    }
                });
            }

            return false;
        },

        visitDirent: function() {
            if ($(window).width() < 768 &&
                !this.model.get('is_img')) { // dir or non image file
                location.href = this.$('.dirent-name a').attr('href');
            }
        },

        viewImageWithPopup: function() {
            var index = $('.img-name-link', this.dirView.$dirent_list).index(this.$('.img-name-link'));
            $.magnificPopup.open(this.dirView.magnificPopupOptions, index);
        },

        share: function() {
            var dir = this.dir,
                obj_name = this.model.get('obj_name'),
                dirent_path = Common.pathJoin([dir.path, obj_name]);

            var options = {
                'is_repo_owner': dir.is_repo_owner,
                'is_virtual': dir.is_virtual,
                'user_perm': this.model.get('perm'),
                'repo_id': dir.repo_id,
                'repo_encrypted': false,
                'is_dir': this.model.get('is_dir') ? true : false,
                'dirent_path': dirent_path,
                'obj_name': obj_name
            };
            new ShareView(options);
            return false;
        },

        del: function() {
            var _this = this;
            if (this.model.get('is_img')) {
                var index = $('.img-name-link', this.dirView.$dirent_list).index(this.$('.img-name-link'));
            }

            var dirent_name = this.model.get('obj_name');
            this.model.deleteFromServer({
                success: function(data) {
                    var msg = gettext("Successfully deleted %(name)s")
                        .replace('%(name)s', dirent_name);
                    Common.feedback(msg, 'success');

                    if (_this.model.get('is_img')) {
                        _this.dirView.updateMagnificPopupOptions({'op':'delete-item', 'index':index});
                    }
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        rename: function() {
            var _this = this;
            var dirent_name = this.model.get('obj_name');

            var form = $(this.renameTemplate({
                dirent_name: dirent_name
            }));

            var $name = this.$('.dirent-name'),
                $op = this.$('.dirent-op'),
                $td = $name.closest('td');
            $td.attr('colspan', 2).css({
                'width': $name.width() + $op.outerWidth(),
                'height': $name.height()
            }).append(form);
            $op.hide();
            $name.hide();

            var $input = $('[name="newname"]', form);
            var dot_index = dirent_name.lastIndexOf('.');
            if (!this.model.get('is_dir') && dot_index != -1) {
                $input[0].setSelectionRange(0, dot_index);
            } else {
                $input.select();
            }

            this._hideMenu();
            app.ui.freezeItemHightlight = true;

            var after_op_success = function(data) {
                app.ui.freezeItemHightlight = false;
                if (app.ui.currentHighlightedItem) {
                    app.ui.currentHighlightedItem.rmHighlight();
                }

                if (_this.model.get('is_img')) {
                    var index = $('.img-name-link', _this.dirView.$dirent_list).index(_this.$('.img-name-link'));
                    _this.dirView.updateMagnificPopupOptions({
                        'op': 'update-item',
                        'index': index,
                        'model': _this.model
                    }); // update the item
                }
            };
            var cancelRename = function() {
                app.ui.freezeItemHightlight = false;
                if (app.ui.currentHighlightedItem) {
                    app.ui.currentHighlightedItem.rmHighlight();
                }
                form.remove();
                $op.show();
                $name.show();
                $td.attr('colspan', 1).css({
                    'width': $name.width()
                });
                return false; // stop bubbling (to 'doc click to hide .hidden-op')
            };
            $('.cancel', form).click(cancelRename);

            var _this = this;
            form.submit(function() {
                var new_name = $.trim($('[name="newname"]', form).val());
                if (!new_name) {
                    return false;
                }
                if (new_name == dirent_name) {
                    cancelRename();
                    return false;
                }

                var submit_btn = $('[type="submit"]', form);
                Common.disableButton(submit_btn);

                var after_op_error = function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err_msg, 'error');
                    Common.enableButton(submit_btn);
                };
                _this.model.rename({
                    newname: new_name,
                    success: after_op_success,
                    error: after_op_error
                });
                return false;
            });
            return false;
        },

        mvcp: function(e) {
            var op_type = $(e.currentTarget).hasClass('mv') ? 'mv' : 'cp';
            var options = {
                'dir': this.dir,
                'dirent': this.model,
                'op_type': op_type
            };
            if (this.model.get('is_img') && op_type == 'mv') {
                var index = $('.img-name-link', this.dirView.$dirent_list).index(this.$('.img-name-link'));
                $.extend(options, {
                    'dirView': this.dirView,
                    'imgIndex': index
                });
            }

            this._hideMenu();
            new DirentMvcpDialog(options);
            return false;
        },

        setFolderPerm: function() {
            var options = {
                'obj_name': this.model.get('obj_name'),
                'dir_path': this.dir.path,
                'repo_id': this.dir.repo_id
            };
            this._hideMenu();
            new FolderPermView(options);
            return false;
        },

        lockFile: function() {
            var _this = this;
            this._hideMenu();
            this.model.lockFile({
                success: function() {
                    _this.$el.removeClass('hl');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        unlockFile: function() {
            var _this = this;
            this._hideMenu();
            this.model.unlockFile({
                success: function() {
                    _this.$el.removeClass('hl');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        open_via_client: function() {
            this._hideMenu();
            return true;
        }

    });

    return DirentView;
});

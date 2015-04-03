define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/views/share'
], function($, _, Backbone, Common, FileTree, ShareView) {
    'use strict';

    app = app || {};
    app.globalState = app.globalState || {};

    var DirentView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#dirent-tmpl').html()),
        renameTemplate: _.template($("#rename-form-template").html()),
        mvcpTemplate: _.template($("#mvcp-form-template").html()),
        mvProgressTemplate: _.template($("#mv-progress-popup-template").html()),

        initialize: function(options) {
            this.dirView = options.dirView;
            this.dir = this.dirView.dir;

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, 'remove', this.remove); // for multi dirents: delete, mv
        },

        render: function() {
            var dir = this.dir;
            this.$el.html(this.template({
                dirent: this.model.attributes,
                dirent_path: Common.pathJoin([dir.path, this.model.get('obj_name')]),
                category: dir.category,
                repo_id: dir.repo_id,
                user_perm: dir.user_perm,
                repo_encrypted: dir.encrypted
            }));
            return this;
        },

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .select': 'select',
            'click .file-star': 'starFile',
            'click .dir-link': 'visitDir',
            'click .more-op-icon': 'togglePopup',
            'click .share': 'share',
            'click .delete': 'delete',
            'click .rename': 'rename',
            'click .mv': 'mvcp',
            'click .cp': 'mvcp'
        },

        highlight: function() {
            if (app.globalState.noFileOpPopup) {
                this.$el.addClass('hl').find('.repo-file-op').removeClass('vh');
            }
        },

        rmHighlight: function() {
            if (app.globalState.noFileOpPopup) {
                this.$el.removeClass('hl').find('.repo-file-op').addClass('vh');
            }
        },

        select: function () {
            var checkbox = this.$('.checkbox');
            checkbox.toggleClass('checkbox-checked');
            if (checkbox.hasClass('checkbox-checked')) {
                this.model.set({'selected':true}, {silent:true}); // do not trigger the 'change' event.
            } else {
                this.model.set({'selected':false}, {silent:true});
            }

            var dirView = this.dirView;
            var $dirents_op = dirView.$('#multi-dirents-op');
            var toggle_all_checkbox = dirView.$('th .checkbox'); // TODO: any better variable name?
            var checked_num = dirView.$('tr:gt(0) .checkbox-checked').length;
            if (checked_num > 0) {
                $dirents_op.css({'display':'inline'});
            } else {
                $dirents_op.hide();
            }
            if (checked_num == dirView.$('tr:gt(0)').length) {
                toggle_all_checkbox.addClass('checkbox-checked');
            } else {
                toggle_all_checkbox.removeClass('checkbox-checked');
            }
        },

        starFile: function() {
            var _this = this;
            var dir = this.dirView.dir;
            //var path = dir.path;
            //path += (path == '/' ? '' : '/');
            var starred = this.model.get('starred');
            var options = { repo_id: dir.repo_id };
            options.name = starred ? 'unstar_file' : 'star_file';
            var filePath = Common.pathJoin([dir.path, this.model.get('obj_name')]);
            var url = Common.getUrl(options) + '?file=' + encodeURIComponent(filePath);
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function () {
                    if (starred) {
                        _this.model.set({'starred':false});
                    } else {
                        _this.model.set({'starred':true});
                    }
                },
                error: Common.ajaxErrorHandler
            });
        },

        visitDir: function () { // todo
            // show 'loading'
            this.$('.dirent-icon img').attr({
                'src': app.config.mediaUrl + 'img/loading-icon.gif',
                'alt':''
            });
            // empty all models
            this.dirView.dir.reset();
            // update url & dirents
            var dir_url = this.$('.dir-link').attr("href");
            app.router.navigate(dir_url, {trigger: true}); // offer an url fragment
            return false;
        },

        togglePopup: function () {
            var icon = this.$('.more-op-icon'),
                popup = this.$('.hidden-op');

            if (popup.hasClass('hide')) { // the popup is not shown

                popup.css({'left': icon.position().left});
                if (icon.offset().top + popup.height() <= $('#main').offset().top + $('#main').height()) {
                    // below the icon
                    popup.css('top', icon.position().top + icon.height() + 3);
                } else {
                    popup.css('bottom', icon.parent().outerHeight() - icon.position().top + 3);
                }

                popup.removeClass('hide');
                app.globalState.noFileOpPopup = false;
                app.globalState.popup_tr = icon.parents('tr');
            } else {
                popup.addClass('hide');
                app.globalState.noFileOpPopup = true;
                app.globalState.popup_tr = '';
            }
        },

        share: function() {
            var dir = this.dir,
                obj_name = this.model.get('obj_name'),
                dirent_path = Common.pathJoin([dir.path, obj_name]);

            var options = {
                'is_repo_owner': dir.is_repo_owner,
                'is_virtual': dir.is_virtual,
                'user_perm': dir.user_perm,
                'repo_id': dir.repo_id,
                'is_dir': this.model.get('is_dir') ? true : false,
                'dirent_path': dirent_path,
                'obj_name': obj_name
            };
            new ShareView(options);
            return false;
        },

        delete: function() {
            var dirent_name = this.model.get('obj_name');
            var options = {
                repo_id: this.dirView.dir.repo_id,
                name: this.model.get('is_dir') ? 'del_dir' : 'del_file'
            };
            var el = this.$el;
            $.ajax({
                url: Common.getUrl(options) + '?parent_dir=' + encodeURIComponent(this.dirView.dir.path)
                + '&name=' + encodeURIComponent(dirent_name),
                dataType: 'json',
                success: function(data) {
                    el.remove();
                    app.globalState.noFileOpPopup = true; // make other items can work normally when hover
                    var msg = gettext("Successfully deleted %(name)s");
                    msg = msg.replace('%(name)s', Common.HTMLescape(dirent_name));
                    Common.feedback(msg, 'success');
                },
                error: Common.ajaxErrorHandler
            });
            return false;
        },

        rename: function() {
            var is_dir = this.model.get('is_dir');
            var title = is_dir ? gettext("Rename Directory") : gettext("Rename File");
            var dirent_name = this.model.get('obj_name');

            var form = $(this.renameTemplate({
                form_title: title,
                dirent_name: dirent_name
            }));
            form.modal({focus:false}); // For 'newname' input: if use the default 'focus:true', text in it will be selected.
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            var op_detail = $('.detail', form);
            op_detail.html(op_detail.html().replace('%(name)s', '<span class="op-target">' + Common.HTMLescape(dirent_name) + '</span>'));

            var form_id = form.attr('id');
            var _this = this;
            var dir = this.dirView.dir;
            form.submit(function() {
                var new_name = $.trim($('[name="newname"]', form).val());
                if (!new_name) {
                    Common.showFormError(form_id, gettext("It is required."));
                    return false;
                }
                if (new_name == dirent_name) {
                    Common.showFormError(form_id, gettext("You have not renamed it."));
                    return false;
                }
                var post_data = {
                    'oldname': dirent_name,
                    'newname': new_name
                };
                var post_url = Common.getUrl({
                    name: is_dir ? 'rename_dir' : 'rename_file',
                    repo_id: dir.repo_id
                }) + '?parent_dir=' + encodeURIComponent(dir.path);
                var after_op_success = function (data) {
                    var renamed_dirent_data = {
                        'obj_name': data['newname'],
                        'last_modified': new Date().getTime()/1000,
                        'last_update': gettext("Just now"),
                        'sharelink': '',
                        'sharetoken': ''
                    };
                    if (is_dir) {
                        /*
                        $.extend(renamed_dirent_data, {
                            'p_dpath': data['p_dpath']
                        });
                        */
                    } else {
                        $.extend(renamed_dirent_data, {
                            'starred': false
                        });
                    }
                    $.modal.close();
                    _this.model.set(renamed_dirent_data); // it will trigger 'change' event
                };
                Common.ajaxPost({
                    'form': form,
                    'post_url': post_url,
                    'post_data': post_data,
                    'after_op_success': after_op_success,
                    'form_id': form_id
                });
                return false;
            });
            return false;
        },

        mvcp: function() {
            var dir = this.dir;
            var el = event.target || event.srcElement,
                op_type = $(el).hasClass('mv') ? 'mv' : 'cp',
                obj_name = this.model.get('obj_name'),
                obj_type = this.model.get('is_dir') ? 'dir' : 'file';

            var title = op_type == 'mv' ? gettext("Move {placeholder} to:") : gettext("Copy {placeholder} to:");
            title = title.replace('{placeholder}', '<span class="op-target">' + Common.HTMLescape(obj_name) + '</span>');

            var form = $(this.mvcpTemplate({
                form_title: title,
                op_type: op_type,
                obj_type: obj_type,
                obj_name: obj_name,
                show_other_repos: !dir.encrypted,
            }));
            form.modal({appendTo:'#main', autoResize:true, focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            FileTree.renderTreeForPath({
                repo_name: dir.repo_name,
                repo_id: dir.repo_id,
                path: dir.path
            });
            if (!dir.encrypted) {
                FileTree.prepareOtherReposTree({cur_repo_id: dir.repo_id});
            }

            var dirent = this.$el;
            var _this = this;
            form.submit(function() {
                var form = $(this),
                    form_id = form.attr('id'),
                    path = dir.path,
                    repo_id = dir.repo_id;
                var dst_repo = $('[name="dst_repo"]', form).val(),
                    dst_path = $('[name="dst_path"]', form).val(),
                    op = $('[name="op"]', form).val(),
                    obj_name = $('[name="obj_name"]', form).val(),
                    obj_type = $('[name="obj_type"]', form).val();

                if (!$.trim(dst_repo) || !$.trim(dst_path)) {
                    $('.error', form).removeClass('hide');
                    return false;
                }
                if (dst_repo == repo_id && (dst_path == path || (obj_type == 'dir' && dst_path == path + obj_name + '/'))) {
                    $('.error', form).html(gettext("Invalid destination path")).removeClass('hide');
                    return false;
                }
                var options = { repo_id: repo_id };
                if (obj_type == 'dir') {
                    options.name = op == 'mv' ? 'mv_dir' : 'cp_dir';
                } else {
                    options.name = op == 'mv' ? 'mv_file' : 'cp_file';
                }
                var post_url = Common.getUrl(options) + '?path=' + encodeURIComponent(path) + '&obj_name=' + encodeURIComponent(obj_name);
                var post_data = {
                    'dst_repo': dst_repo,
                    'dst_path': dst_path
                };
                var after_op_success = function(data) {
                    $.modal.close();
                    var msg = data['msg'];
                    if (!data['task_id']) { // no progress
                        if (op == 'mv') {
                            dirent.remove();
                        }
                        Common.feedback(msg, 'success');
                    } else {
                        var mv_progress_popup = $(_this.mvProgressTemplate());
                        var details = $('#mv-details', mv_progress_popup),
                            cancel_btn = $('#cancel-mv', mv_progress_popup),
                            other_info = $('#mv-other-info', mv_progress_popup);
                        cancel_btn.removeClass('hide');
                        setTimeout(function () {
                            mv_progress_popup.modal({containerCss: {
                                width: 300,
                                height: 150,
                                paddingTop: 50
                            }, focus:false});
                            var det_text = op == 'mv' ? gettext("Moving %(name)s") : gettext("Copying %(name)s");
                            details.html(det_text.replace('%(name)s', Common.HTMLescape(obj_name))).removeClass('vh');
                            $('#mv-progress').progressbar();
                            req_progress();
                        }, 100);
                        var req_progress = function () {
                            $.ajax({
                                url: Common.getUrl({name: 'get_cp_progress'}) + '?task_id=' + encodeURIComponent(data['task_id']),
                                dataType: 'json',
                                success: function(data) {
                                    var bar = $('.ui-progressbar-value', $('#mv-progress'));
                                    if (!data['failed'] && !data['canceled'] && !data['successful']) {
                                        if (data['done'] == data['total']) {
                                            bar.css('width', '100%'); // 'done' and 'total' can be both 0
                                            details.addClass('vh');
                                            cancel_btn.addClass('hide');
                                            other_info.html(gettext("Saving...")).removeClass('hide');
                                        } else {
                                            bar.css('width', parseInt(data['done']/data['total']*100, 10) + '%');
                                        }
                                        bar.show();
                                        setTimeout(req_progress, 1000);
                                    } else if (data['successful']) {
                                        $.modal.close();
                                        if (op == 'mv') {
                                            dirent.remove();
                                        }
                                        Common.feedback(msg, 'success');
                                    } else { // failed or canceled
                                        details.addClass('vh');
                                        var other_msg = data['failed'] ? gettext("Failed.") : gettext("Canceled.");
                                        other_info.html(other_msg).removeClass('hide');
                                        cancel_btn.addClass('hide');
                                        setTimeout(function () { $.modal.close(); }, 1000);
                                    }
                                },
                                error: function(xhr, textStatus, errorThrown) {
                                    var error;
                                    if (xhr.responseText) {
                                        error = $.parseJSON(xhr.responseText).error;
                                    } else {
                                        error = gettext("Failed. Please check the network.");
                                    }
                                    details.addClass('vh')
                                    other_info.html(error).removeClass('hide');
                                    cancel_btn.addClass('hide');
                                    setTimeout(function () { $.modal.close(); }, 1000);
                                }
                            });
                        };

                        cancel_btn.click(function() {
                            Common.disableButton(cancel_btn);
                            $.ajax({
                                url: Common.getUrl({name: 'cancel_cp'}) + '?task_id=' + encodeURIComponent(data['task_id']),
                                dataType: 'json',
                                success: function(data) {
                                    details.addClass('vh')
                                    other_info.html(gettext("Canceled.")).removeClass('hide');
                                    cancel_btn.addClass('hide');
                                    setTimeout(function () {$.modal.close();}, 1000);
                                },
                                error: function(xhr, textStatus, errorThrown) {
                                    var error;
                                    if (xhr.responseText) {
                                        error = $.parseJSON(xhr.responseText).error;
                                    } else {
                                        error = gettext("Failed. Please check the network.");
                                    }
                                    other_info.html(error).removeClass('hide');
                                    Common.enableButton(cancel_btn);
                                }
                            });
                        });
                    }
                }
                Common.ajaxPost({
                    'form': form,
                    'post_url': post_url,
                    'post_data': post_data,
                    'after_op_success': after_op_success,
                    'form_id': form_id
                });
                return false;
            });
            return false;
        }

    });

    return DirentView;
});

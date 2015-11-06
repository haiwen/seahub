define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/views/share',
], function($, _, Backbone, Common, FileTree, ShareView) {
    'use strict';

    app = app || {};
    app.globalState = app.globalState || {};

    var DirentGridView = Backbone.View.extend({
        tagName: 'li',

        template: _.template($('#grid-view').html()),
        renameTemplate: _.template($("#grid-rename-form-template").html()),
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
            var dirent_path = Common.pathJoin([dir.path, this.model.get('obj_name')]);
            var is_pro = app.pageOptions.is_pro;

            this.$el.html(this.template({
                dirent: this.model.attributes,
                dirent_path: dirent_path,
                encoded_path: Common.encodePath(dirent_path),
                category: dir.category,
                repo_id: dir.repo_id,
                is_repo_owner: dir.is_repo_owner,
                can_generate_shared_link: app.pageOptions.can_generate_shared_link,
                is_pro: is_pro,
                repo_encrypted: dir.encrypted
            })).addClass('fleft grid-item');
            if (this.selected) {
                this.$el.$('.grid-img-container').addClass('hl');
            }
            this.$('.file-locked-icon').attr('title', gettext("locked by {placeholder}").replace('{placeholder}', this.model.get('lock_owner_name')));
            return this;
        },
        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'mousedown .grid-img-inner-container img': 'showPopupMenu',
            'click .grid-img-container': 'multiChoose',
            'click .select': 'select',
            'click .dir-link': 'visitDir',
            'click .share': 'share',
            'click .delete': 'del', // 'delete' is a preserve word
            'click .rename': 'rename',
            'click .mv': 'mvcp',
            'click .cp': 'mvcp'
        },

        highlight: function() {
            if (!$('.grid-hidden-op:visible').length && !$('#grid-rename-form').length) {
                this.$('.grid-img-inner-container').addClass('hl');
            }
        },

        rmHighlight: function() {
            if (!$('.grid-hidden-op:visible').length && !$('#grid-rename-form').length) {
                this.$('.grid-img-inner-container').removeClass('hl');
            }
        },

        showPopupMenu: function(e) {
            e = e || window.event;
            if (e.which == 3 && this.dirView.$('.grid-item .grid-img-container.hl').length == 0) {
                $('.grid-hidden-op').addClass('hide');
                this.$('.grid-img-container').addClass('hl').children('.grid-img-inner-container').removeClass('hl');
                this.$('.grid-hidden-op').css({
                    'left': (e.pageX || e.clientX + document.body.scroolLeft),
                    'top': e.pageY || e.clientY + document.body.scrollTop,
                }).removeClass('hide');
                return false;
            };
        },

        multiChoose: function(e) {
            var index = this.$el.index();
            var dirView = this.dirView;
            if (e.which == 1 && dirView.$multi_choose == true) {
                dirView.$('td.select').eq(index).click();
            } else if (e.which == 1 && dirView.$multi_choose == false) {
                dirView.$('td.select .checkbox-checked').click();
                dirView.$('td.select').eq(index).click();
                return false;
            }
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
            var dirent_name = this.model.get('obj_name');
            var dir = this.dir;
            var options = {
                repo_id: dir.repo_id,
                name: this.model.get('is_dir') ? 'del_dir' : 'del_file'
            };
            var model = this.model;
            $.ajax({
                url: Common.getUrl(options) + '?parent_dir=' + encodeURIComponent(dir.path)
                + '&name=' + encodeURIComponent(dirent_name),
                type: 'POST',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                success: function(data) {
                    dir.remove(model);
                    var msg = gettext("Successfully deleted %(name)s")
                        .replace('%(name)s', Common.HTMLescape(dirent_name));
                    Common.feedback(msg, 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        rename: function() {
            var is_dir = this.model.get('is_dir');
            var dirent_name = this.model.get('obj_name');
            var grid_hidden_op = this.$('.grid-hidden-op');
            var form = $(this.renameTemplate({
                grid_dirent_name: dirent_name
            }));

            var $name = this.$('.grid-link'),
                $zpt = this.$('.grid-img-container'),
                $op = this.$('.grid-link-container');
            $op.css('width', $('.grid-item').width()).css('margin', 0);
            grid_hidden_op.addClass('hide');
            $zpt.addClass('hl');
            $op.prepend(form);
            $op.children('.input').select();

            $name.hide();

            var cancelRename = function() {
                $name.css('width', '104').show();
                form.remove();
                $zpt.removeClass('hl');
                $op.css({
                    'width': 104,
                    'margin': '0 auto'
                });
                return false; // stop bubbling (to 'doc click to hide .hidden-op')
            };

            $('.cancel', form).click(cancelRename);

            var form_id = form.attr('id');
            var _this = this;
            var dir = this.dirView.dir;
            form.submit(function() {
                var new_name = $.trim($('[name="grid_newname"]', form).val());
                if (!new_name) {
                    return false;
                }
                if (new_name == dirent_name) {
                    cancelRename();
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
                        'last_update': gettext("Just now")
                    };
                    if (!is_dir) {
                        $.extend(renamed_dirent_data, {
                            'starred': false
                        });
                    }
                    $.modal.close();
                    _this.model.set(renamed_dirent_data); // it will trigger 'change' event
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

         mvcp: function(event) {
            var dir = this.dir;
            var el = event.target || event.srcElement,
                op_type = $(el).hasClass('mv') ? 'mv' : 'cp',
                obj_name = this.model.get('obj_name'),
                obj_type = this.model.get('is_dir') ? 'dir' : 'file';

            var title = op_type == 'mv' ? gettext("Move {placeholder} to:") : gettext("Copy {placeholder} to:");
            title = title.replace('{placeholder}', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(obj_name) + '">' + Common.HTMLescape(obj_name) + '</span>');

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
            var dirent_list = this.dirView.$('.repo-file-list tr').eq(this.$el.index()+1);
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
                            // dirent.remove();
                            dirent_list.remove();
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
                                            dirent_list.remove();
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
        },

        visitDir: function() {
            this.dirView.dir.reset();
            this.dirView.$if_switched = false;
            // update url & dirents
            var dir_url = this.$('.dir-link').attr("href");
            app.router.navigate(dir_url, {trigger: true}); // offer an url fragment
            return false;
        }
    });

    return DirentGridView;
});

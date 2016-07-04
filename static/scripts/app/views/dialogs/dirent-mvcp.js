define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree'
], function($, _, Backbone, Common, FileTree) {
    'use strict';

    var DirentMvcpDialog = Backbone.View.extend({

        mvcpTemplate: _.template($("#mvcp-form-template").html()),
        mvProgressTemplate: _.template($("#mv-progress-popup-template").html()),

        initialize: function(options) {
            this.dirent = options.dirent;
            this.dir = options.dir;
            this.op_type = options.op_type;

            // only show current repo if current repo is read-write
            this.show_cur_repo = this.dirent.get('perm') == 'rw' ? true : false;

            this.render();
            this.$el.modal({appendTo:'#main', autoResize:true, focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            if (this.show_cur_repo) {
                FileTree.renderTreeForPath({
                    $form: this.$el,
                    $container: this.$('#current-repo-dirs'),
                    repo_name: this.dir.repo_name,
                    repo_id: this.dir.repo_id,
                    path: this.dir.path
                });
            }
            if (!this.dir.encrypted) {
                FileTree.prepareOtherReposTree({cur_repo_id: this.dir.repo_id});
            }

            this.$error = this.$('.error');
            this.$form = this.$('form');
        },

        render: function() {
            var dir = this.dir;
            var obj_name = this.dirent.get('obj_name'),
                obj_type = this.dirent.get('is_dir') ? 'dir' : 'file';

            var title = this.op_type == 'mv' ?
                gettext("Move {placeholder} to:") : gettext("Copy {placeholder} to:");
            title = title.replace('{placeholder}',
                '<span class="op-target ellipsis ellipsis-op-target" title="'
                + Common.HTMLescape(obj_name) + '">' + Common.HTMLescape(obj_name) + '</span>');

            this.$el.html(this.mvcpTemplate({
                form_title: title,
                op_type: this.op_type,
                obj_type: obj_type,
                obj_name: this.dirent.get('obj_name'),
                show_cur_repo: this.show_cur_repo,
                show_other_repos: !dir.encrypted
            }));

            return this;
        },

        events: {
            'submit form': 'formSubmit'
        },

        _showProgress: function(msg, task_id) {
            var _this = this;
            var op = this.op_type,
                obj_name = this.dirent.get("obj_name");
            var mv_progress_popup = $(_this.mvProgressTemplate());
            var details = $('#mv-details', mv_progress_popup),
                cancel_btn = $('#cancel-mv', mv_progress_popup),
                other_info = $('#mv-other-info', mv_progress_popup);

            cancel_btn.removeClass('hide');

            setTimeout(function() {
                mv_progress_popup.modal({containerCss: {
                    width: 300,
                    height: 150,
                    paddingTop: 50
                }, focus:false});
                var det_text = _this.op_type == 'mv' ?
                    gettext("Moving %(name)s") : gettext("Copying %(name)s");
                details.html(det_text.replace('%(name)s', Common.HTMLescape(obj_name))).removeClass('vh');
                $('#mv-progress').progressbar();
                req_progress();
            }, 100);
            var req_progress = function() {
                $.ajax({
                    url: Common.getUrl({name: 'get_cp_progress'}) + '?task_id=' + encodeURIComponent(task_id),
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
                    url: Common.getUrl({name: 'cancel_cp'}) + '?task_id=' + encodeURIComponent(task_id),
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
        },

        formSubmit: function() {
            var _this = this;
            var path = this.dir.path,
                repo_id = this.dir.repo_id,
                obj_name = this.dirent.get('obj_name'),
                obj_type = this.dirent.get('is_dir') ? 'dir' : 'file';
            var dst_repo = $('[name="dst_repo"]', this.$form).val(),
                dst_path = $('[name="dst_path"]', this.$form).val();

            if (!$.trim(dst_repo) || !$.trim(dst_path)) {
                $('.error', form).removeClass('hide');
                return false;
            }
            if (dst_repo == repo_id && (dst_path == path || (obj_type == 'dir' && dst_path == path + obj_name + '/'))) {
                this.$error.html(gettext("Invalid destination path")).removeClass('hide');
                return false;
            }
            var options = { repo_id: repo_id };
            if (obj_type == 'dir') {
                options.name = this.op_type == 'mv' ? 'mv_dir' : 'cp_dir';
            } else {
                options.name = this.op_type == 'mv' ? 'mv_file' : 'cp_file';
            }
            var post_url = Common.getUrl(options) + '?path=' + encodeURIComponent(path)
                + '&obj_name=' + encodeURIComponent(obj_name);
            var post_data = {
                'dst_repo': dst_repo,
                'dst_path': dst_path
            };
            var after_op_success = function(data) {
                $.modal.close();
                var msg;

                if (_this.op_type == 'mv') {
                    msg = gettext("Successfully moved %(name)s")
                        .replace('%(name)s', obj_name);
                } else {
                    msg = gettext("Successfully copied %(name)s")
                        .replace('%(name)s', obj_name);
                }

                if (!data['task_id']) { // no progress
                    if (_this.op_type == 'mv') {
                        _this.dir.remove(_this.dirent);
                    }
                    Common.feedback(msg, 'success');
                } else {
                    _this._showProgress(msg, data['task_id']);
                }
            }
            Common.ajaxPost({
                'form': this.$form,
                'post_url': post_url,
                'post_data': post_data,
                'after_op_success': after_op_success,
                'form_id': this.$form.attr('id')
            });
            return false;
        }

    });

    return DirentMvcpDialog;
});

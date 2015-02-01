define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'text!' + app.config._tmplRoot + 'dirent.html'
], function($, _, Backbone, Common, FileTree, direntsTemplate) {
    'use strict';

    app = app || {};
    app.globalState = app.globalState || {};

    var DirentView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(direntsTemplate),
        shareTemplate: _.template($("#share-dialog-template").html()),
        renameTemplate: _.template($("#rename-form-template").html()),
        mvcpTemplate: _.template($("#mvcp-form-template").html()),

        initialize: function(options) {
            this.options = options || {};
            this.model = options.model;
            this.dirView = options.dirView;

            app.globalState.noFileOpPopup = true;
            this.listenTo(this.model, "change", this.render);
            //Backbone.View.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            var dirent_path = Common.pathJoin([this.dirView.dir.path,
                this.model.attributes.obj_name]);
            //console.log(Common.pathJointhis.dirView.dir.path + "/" + this.model.attributes.obj_name);
            this.$el.html(this.template({
                dirent: this.model.attributes,
                repo_id: this.dirView.dir.repo_id,
                // dir_path: this.dirView.dir.path,
                dirent_path: dirent_path,
                user_perm: this.dirView.dir.user_perm,
                repo_encrypted: this.dirView.dir.encrypted
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
            'click .del': 'delete',
            'click .rename': 'rename',
            'click .mv': 'mvcp',
            'click .cp': 'mvcp',
            'click .file-update': 'updateFile'
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

        visitDir: function () {
            // show 'loading'
            this.$('.dirent-icon img').attr({
                'src': app.config.mediaURL + 'img/loading-icon.gif',
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
                if (icon.position().left + icon.width() + popup.outerWidth() < icon.parent().width()) {
                    popup.css({'left': icon.position().left + icon.width() + 5});
                    if (icon.offset().top + popup.height() <= $('#main').offset().top + $('#main').height()) {
                        popup.css('top', 6);
                    } else {
                        popup.css('bottom', 2);
                    }
                } else {
                    popup.css({'right':0});
                    if (icon.offset().top + popup.height() <= $('#main').offset().top + $('#main').height()) {
                        popup.css('top', icon.position().top + icon.height() + 3);
                    } else {
                        popup.css('bottom', icon.position().top + icon.height() + 3);
                    }
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
            /*
            var op = this.$('.share'),
                name = this.model.get('obj_name');
            var col = this.collection;
            var cur_path = col.path;
            cur_path += cur_path == '/' ? '' : '/';
            var repo_id = col.repo_id;
            var ajax_urls = {
                'link': app.utils.getUrl({name: 'get_shared_link'}) + '?repo_id=' + e(repo_id) + '&p=' + e(cur_path + name),
                'upload-link': app.utils.getUrl({name: 'get_shared_upload_link'}) + '?repo_id=' + e(repo_id) + '&p=' + e(cur_path + name)
            };
            var type = this.model.get('is_dir') ? 'd' : 'f';
            if (type == 'd') {
                ajax_urls['link'] += '&type=d';
            }
            op.data('repo', {
                'is_repo_owner': col.is_repo_owner,
                'is_virtual': col.is_virtual,
                'user_perm': col.user_perm,
                'repo_id': col.repo_id});
                */
            var obj_name = this.model.get("obj_name");
            var title = gettext("Sharing {placeholder}")
                .replace('{placeholder}', '<span class="op-target">' + obj_name + '</span>');
            var dialog = $(this.shareTemplate({
                title: title,
                is_repo_owner: this.dirView.dir.is_repo_owner,
                is_virtual: this.dirView.dir.is_virtual,
                user_perm: this.dirView.dir.user_perm,
                repo_id: this.dirView.dir.repo_id,
            }));
            dialog.modal();
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
            //showSharePopup(op, name, ajax_urls, type, cur_path);
            return false;
        },

        delete: function() {
            var dirent_name = this.model.get('obj_name');
            var options = {repo_id: this.dirView.dir.repo_id};
            options.name = this.model.get('is_dir') ? 'del_dir' : 'del_file';
            var url_main = Common.getUrl(options);
            var el = this.$el;
            $.ajax({
                url: url_main + '?parent_dir=' + encodeURIComponent(this.dirView.dir.path)
                + '&name=' + encodeURIComponent(dirent_name),
                dataType: 'json',
                success: function(data) {
                    el.remove();
                    app.globalState.noFileOpPopup = true;// make other items can work normally when hover
                    var msg = gettext("Successfully deleted %(name)s");
                    msg = msg.replace('%(name)s', dirent_name);
                    Common.feedback(msg, 'success');
                },
                error: Common.ajaxErrorHandler
            });
            return false;
        },

        rename: function() {
            var is_dir = this.model.get('is_dir');
            //var hd_text = is_dir ? "{% trans "Rename Directory" %}" : "{% trans "Rename File" %}";
            var title = is_dir ? gettext("Rename Directory") : gettext("Rename File");
            //var op_detail = $('.detail', form);
            //op_detail.html(op_detail.html().replace('%(name)s', '<span class="op-target">' + dirent_name + '</span>'));
            var dirent_name = this.model.get('obj_name');

            var form = $(this.renameTemplate({
                form_title: title,
                dirent_name: dirent_name,
            }));
            form.modal();
            var form_id = form.attr('id');
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

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
                var post_data = {'oldname': dirent_name, 'newname':new_name};
                var options = { repo_id: dir.repo_id };
                options.name = is_dir ? 'rename_dir' : 'rename_file';
                var post_url = Common.getUrl(options) + '?parent_dir=' + encodeURIComponent(dir.path);
                var after_op_success = function (data) {
                    new_name = data['newname'];
                    var now = new Date().getTime()/1000;
                    $.modal.close();
                    _this.model.set({ // it will trigger 'change' event
                        'obj_name': new_name,
                        'last_modified': now,
                        //'last_update': "{% trans "Just now" %}",
                        'last_update': "Just now",
                        'sharelink': '',
                        'sharetoken': ''
                    });
                    if (is_dir) {

                    } else {
                        _this.model.set({
                            'starred': false
                        });
                    }
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
            var el = event.target || event.srcElement,
                op_type = $(el).hasClass('mv') ? 'mv':'cp',
                obj_name = this.model.get('obj_name'),
                obj_type = this.model.get('is_dir') ? 'dir':'file';

            var title;
            if (op_type == 'mv')
                title = gettext("Move {placeholder} to:")
                    .replace('{placeholder}', '<span class="op-target">' + obj_name + '</span>');
            else
                title = gettext("Copy {placeholder} to:")
                    .replace('{placeholder}', '<span class="op-target">' + obj_name + '</span>');
            var form = $(this.mvcpTemplate({
                form_title: title,
                op_type: op_type,
                obj_type: obj_type,
                obj_name: obj_name,
                show_other_repos: !this.dirView.dir.encrypted,
            }));
            form.modal({appendTo:'#main', autoResize:true, focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            FileTree.renderTreeForPath({
                repo_name: this.dirView.dir.repo_name,
                repo_id: this.dirView.dir.repo_id,
                path: this.dirView.dir.path,
            });
            if (!this.dirView.dir.encrypted) {
                FileTree.prepareOtherReposTree({cur_repo_id: this.dirView.dir.repo_id});
            }
            return false;
        },

    });

    return DirentView;
});

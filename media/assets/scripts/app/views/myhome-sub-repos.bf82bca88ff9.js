define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/collections/repos',
    'app/views/sub-lib',
    'app/views/add-repo',
], function($, _, Backbone, Common, FileTree, RepoCollection, RepoView, AddRepoView) {
    'use strict';

    var ReposView = Backbone.View.extend({
        el: $('#repo-tabs'),

        events: {
            'click #sub-lib-create': 'createRepo'
        },

        initialize: function(options) {
            this.$tabs = $('#repo-tabs');
            this.$table = this.$('#my-sub-repos table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = $('.loading-tip', this.$tabs);
            this.$emptyTip = $('#my-sub-repos .empty-tips');

            this.repos = new RepoCollection({type: 'sub'});
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);
        },

        addOne: function(repo, collection, options) {
            var view = new RepoView({model: repo});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        reset: function() {
            this.$('.error').hide();
            this.$tableBody.empty();
            this.repos.each(this.addOne, this);
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
            this.$loadingTip.hide();
        },

        showSubRepos: function() {
            this.$tabs.show();
            $('#sublib-tab').parent().addClass('ui-state-active');
            this.$table.hide();
            var $loadingTip = this.$loadingTip;
            $loadingTip.show();
            var _this = this;
            this.repos.fetch({
                reset: true,
                success: function (collection, response, opts) {
                },
                error: function (collection, response, opts) {
                    $loadingTip.hide();
                    var $error = _this.$('.error');
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = gettext("Error");
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $error.html(err_msg).show();
                }
            });
        },

        show: function() {
            $('#sub-lib-create').show();
            this.showSubRepos();
        },

        hide: function() {
            $('#sub-lib-create').hide();
            this.$el.hide();
            this.$table.hide();
            this.$emptyTip.hide();
            $('#sublib-tab', this.$tabs).parent().removeClass('ui-state-active');
        },

        createRepo: function() {
            var _this = this;

            var sublib_create_form = $('#sublib-create-form');

            var dir_tree_cont = $('.dir-tree-cont', sublib_create_form);
            sublib_create_form.modal();

            $.ajax({
                url: Common.getUrl({'name': 'get_my_unenc_repos'}),
                cache: false,
                dataType: 'json',
                success: function(data) {
                    var repos = FileTree.formatRepoData(data);
                    if (repos.length > 0) {
                        FileTree.renderDirTree(dir_tree_cont, sublib_create_form, repos);
                    } else {
                        dir_tree_cont.html('<p class="error">' + gettext("You don't have any library at present.") + '</p>');
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    var error;
                    if (jqXHR.responseText) {
                        error = $.parseJSON(jqXHR.responseText).error;
                    } else {
                        error = gettext("Failed. Please check the network.");
                    }
                    dir_tree_cont.html('<p class="error">' + error + '</p>');
                }
            });

            $('.submit', sublib_create_form).click(function() {
                var ori_repo_id = $('[name="dst_repo"]', sublib_create_form).val();
                var path = $('[name="dst_path"]', sublib_create_form).val();

                if (!path || path == '/') {
                    $('.error', sublib_create_form).html(gettext("Please choose a directory")).removeClass('hide');
                    return false;
                }

                // path ends with '/', rm it here
                path = path.substr(0, path.length - 1);
                $.ajax({
                    url: Common.getUrl({'name':'sub_repo', 'repo_id':ori_repo_id}) + '?p=' + encodeURIComponent(path),
                    dataType: 'json',
                    success: function(data) {
                        $.modal.close();
                        var new_sub_lib = {
                            'id': data["sub_repo_id"],
                            'name': data["name"],
                            'origin_repo_id': ori_repo_id,
                            'origin_path': path,
                            'abbrev_origin_path': data["abbrev_origin_path"],
                            'mtime': new Date().getTime() / 1000,
                            'mtime_relative': gettext("Just now")
                        };
                        if (_this.repos.length > 0) {
                            _this.repos.add(new_sub_lib , {prepend: true});
                        } else {
                            _this.repos.reset([new_sub_lib]);
                        }
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        var err;
                        if (xhr.responseText) {
                            err = jQuery.parseJSON(xhr.responseText).error;
                        } else {
                            err = gettext("Failed. Please check the network.");
                        }
                        $('.error', sublib_create_form).html(err).removeClass('hide');
                    }
                });
                return false;
            });
        }

    });

    return ReposView;
});

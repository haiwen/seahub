define([
  'jquery',
  'jstree',
  'underscore',
  'backbone',
  'common',
  ], function($, jstree, _, Backbone, Common) {
    'use strict';

    $.jstree._themes = app.config.mediaUrl + 'js/themes/';

    var FileTree = {

        options: {},

        formatRepoData: function(data) {
            var repos = [], repo;
            for (var i = 0, len = data.length; i < len; i++) {
                repo = {
                    'data': data[i].name,
                    'attr': {'repo_id': data[i].id, 'root_node': true},
                    'state': 'closed'
                }
                repos.push(repo);
            }
            return repos;
        },

        /**
        * @container(required): container.data('site_root', '{{SITE_ROOT}}')
        * @options (optional): {'two_state': true}
        */
        renderFileTree: function(container, repo_data, options) {
            var opts = options || {};
            container
            .delegate('.jstree-closed', 'dblclick', function(e) {
                container.jstree('open_node', $(this));
                $(this).find('a').removeClass('jstree-clicked');
            })
            .bind('select_node.jstree', function(e, data) {
                $('.jstree-clicked').removeClass('jstree-clicked'); // do not show selected item
            })
            .jstree({
                'json_data': {
                    'data': repo_data,
                    'ajax': {
                        'url': function(data) {
                            var path = this.get_path(data);
                            var repo_id;
                            if (path.length == 1) {
                                path = '/';
                                repo_id = data.attr('repo_id');
                            } else {
                                var root_node = data.parents('[root_node=true]');
                                repo_id = root_node.attr('repo_id');
                                path.shift();
                                path = '/' + path.join('/') + '/';
                            }
                            return app.config.siteRoot + 'ajax/repo/' + repo_id + '/dirents/?path=' + e(path);
                        },
                        'success': function(data) {
                            var items = [];
                            var o, item;
                            for (var i = 0, len = data.length; i < len; i++) {
                                o = data[i];
                                if (o.type == 'dir') {
                                    item = {
                                        'data': o.name,
                                        'attr': { 'type': o.type },
                                        'state': 'closed'
                                    };
                                } else {
                                    item = {
                                        'data': o.name,
                                        'attr': {'type': o.type }
                                    };
                                }
                                items.push(item);
                            }
                            return items;
                        }
                    }
                },
                'core': {
                    'animation': 100
                },
                'themes': {
                    'theme':'classic'
                },
                'checkbox':{
                    'two_state': opts.two_state, // default: false. when 'true', dir can be checked separately with file
                    // make dir can only be selected
                    //'override_ui':true, // nodes can be checked, or selected to be checked
                    'real_checkboxes': true,
                    'real_checkboxes_names': function(node) {
                        // get the path array consisting of nodes starting from the root node
                        var path_array = this.get_path(node);
                        var repo_id, path;
                        if (path_array.length == 1) {
                            // root node
                            path = '/';
                            repo_id = node.attr('repo_id');
                        } else {
                            path_array.shift();
                            repo_id = node.parents('[root_node=true]').attr('repo_id');
                            if (node.attr('type') == 'dir') {
                                path = '/' + path_array.join('/') + '/';
                            } else {
                                path = '/' + path_array.join('/');
                            }
                        }
                        return ['selected', repo_id + path];
                    }
                },
                'plugins': ['themes', 'json_data', 'ui', 'checkbox']
            });
        },

        // only list dirs
        renderDirTree: function(container, form, repo_data) {
            container
            .delegate('.jstree-closed', 'dblclick', function(e) {
                container.jstree('open_node', $(this));
                $(this).find('a').removeClass('jstree-clicked');
            })
            .bind('before.jstree', function(e, data) {
                if (data.func === 'select_node') { // ensure only one selected dir display in the popup
                    $('.jstree-clicked', form).removeClass('jstree-clicked');
                }
            })
            .bind('select_node.jstree', function(e, data) {
                var path, repo_id;
                var path_array = data.inst.get_path(data.rslt.obj);
                if (path_array.length == 1) {
                    path = '/';
                    repo_id = data.rslt.obj.attr('repo_id');
                } else {
                    repo_id = data.rslt.obj.parents('[root_node=true]').attr('repo_id');
                    path_array.shift();
                    path = '/' + path_array.join('/') + '/';
                }
                $('input[name="dst_repo"]', form).val(repo_id);
                $('input[name="dst_path"]', form).val(path);
            })
            .jstree({
                'json_data': {
                    'data': repo_data,
                    'ajax': {
                        'url': function(data) {
                            var path = this.get_path(data);
                            var repo_id;
                            if (path.length == 1) {
                                path = '/';
                                repo_id = data.attr('repo_id');
                            } else {
                                repo_id = data.parents('[root_node=true]').attr('repo_id');
                                path.shift();
                                path = '/' + path.join('/') + '/';
                            }
                            return app.config.siteRoot + 'ajax/repo/' + repo_id + '/dirents/?dir_only=true&path=' + encodeURIComponent(path);
                        },
                        'success': function(data) {
                            var items = [];
                            var o, item;
                            for (var i = 0, len = data.length; i < len; i++) {
                                o = data[i];
                                if (o.has_subdir) {
                                    item = {
                                        'data': o.name,
                                        'attr': { 'type': o.type },
                                        'state': 'closed'
                                    };
                                } else {
                                    item = {
                                        'data': o.name,
                                        'attr': {'type': o.type }
                                    };
                                }
                                items.push(item);
                            }
                            return items;
                        }
                    }
                },
                'core': {
                    'animation': 100
                },
                'plugins': ['themes', 'json_data', 'ui']
            });
        },

        renderTreeForPath: function(options) {
            // check templates/snippets/lib_op_popups.html for the template
            var form = $('#mv-form'),
                container = $('#current-repo-dirs'),
                loading_tip = container.prev();

            var repo_name = options.repo_name,
                repo_id = options.repo_id;
            var cur_path = options.path;
            if (cur_path != '/') {
                cur_path += '/';
            }
            var _this = this;
            // container.data('site_root', '{{SITE_ROOT}}');
            $.ajax({
                url: Common.getUrl({name: 'get_dirents', repo_id: options.repo_id})
                + '?path=' + encodeURIComponent(cur_path) + '&dir_only=true&all_dir=true',
                cache: false,
                dataType: 'json',
                success: function(data) {
                    var json_data = [];
                    var repo_data = {
                        'data': repo_name,
                        'attr': {'repo_id': repo_id, 'root_node': true},
                        'state': 'open'
                    };

                    var path_eles = cur_path.split('/');
                    path_eles.pop();
                    /* e.g.
                    * path: '/xx/'
                    * path_eles: ['', 'xx']
                    * data: [["xxx", "xx", "test1022"], ["lkjj", "kjhkhi"]]
                    * when no dir in '/', data will be [[]];
                    */
                    var len = data.length;
                    var children = [];
                    for (var i = len - 1; i > -1; i--) {
                        children[i] = [];
                        if (i == len - 1) {
                            for (var j = 0, len_i = data[i].length; j < len_i; j++) {
                                children[i].push({
                                    'data': data[i][j],
                                    'state': 'closed'
                                });
                            }
                        } else {
                            for (var j = 0, len_i = data[i].length; j < len_i; j++) {
                                if (data[i][j] == path_eles[i+1]) {
                                    children[i].push({
                                        'data': data[i][j],
                                        'state': 'open',
                                        'children': children[i+1]
                                    });
                                } else {
                                    children[i].push({
                                        'data': data[i][j],
                                        'state': 'closed'
                                    });
                                }
                            }
                        }
                    }
                    if (children[0].length > 0) {
                        $.extend(repo_data, {'children': children[0]});
                    }
                    json_data.push(repo_data);

                    loading_tip.hide();
                    _this.renderDirTree(container, form, json_data);
                    container.removeClass('hide');
                },
                error: function() {
                    var cur_repo = [{
                        'data': repo_name,
                        'attr': {'repo_id': repo_id, 'root_node': true},
                        'state': 'closed'
                    }];
                    loading_tip.hide();
                    _this.renderDirTree(container, form, cur_repo);
                    container.removeClass('hide');
                }
            });


        },

        prepareOtherReposTree: function(options) {
            var _this = this;

            $('#mv-dir-list #other-repos .hd').click(function() {
                var span = $('span', $(this)),
                    form = $('#mv-form'),
                    loading_tip = $(this).next(),
                    dir_tree_container = $("#mv-dir-list #other-repos #other-repos-dirs");

                if (span.hasClass('icon-caret-right')) {
                    span.attr('class','icon-caret-down');
                    loading_tip.show();
                    $.ajax({
                        url: Common.getUrl({name:'unenc_rw_repos'}),
                        cache: false,
                        dataType: 'json',
                        success: function(data) {
                            var other_repos = [];
                            var cur_repo_id = options.cur_repo_id;
                            for (var i = 0, len = data.length; i < len; i++) {
                                if (data[i].id != cur_repo_id) {
                                    other_repos.push({
                                    'data': data[i].name,
                                    'attr': {'repo_id': data[i].id, 'root_node': true},
                                    'state': 'closed'
                                    });
                                }
                            }
                            loading_tip.hide();
                            _this.renderDirTree(dir_tree_container, form, other_repos);
                            dir_tree_container.removeClass('hide');
                        }
                    });
                } else {
                    span.attr('class','icon-caret-right');
                    dir_tree_container.addClass('hide');
                }
            });

        }


    };

    return FileTree;
});

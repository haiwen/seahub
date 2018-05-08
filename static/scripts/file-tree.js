define([
  'jquery',
  'jstree',
  'underscore',
  'backbone',
  'common'
  ], function($, jstree, _, Backbone, Common) {
    'use strict';

    var FileTree = {

        renderFileTree: function() {
        },

        // only list dirs
        renderDirTree: function($container, $form, initial_data) {
            $container.jstree({
                'core': {
                    'data': function(node, callback) {
                        if (node.id == "#") {
                            callback(initial_data);
                        } else {
                            var repo_id;
                            var node_path = node.data.path;
                            if (node.parents.length == 1) { // parents: ['#']
                                repo_id = node.data.repo_id;
                            } else {
                                repo_id = $container.jstree('get_node', node.parents[node.parents.length - 2]).data.repo_id;
                            }
                            $.ajax({
                                url: Common.getUrl({name: 'get_dirents', repo_id: repo_id})
                                + '?path=' + encodeURIComponent(node_path) + '&dir_only=true',
                                cache: false,
                                dataType: 'json',
                                success: function(data) { // data: [{'name': ''}, ...]
                                    if (data.length) {
                                        for (var i = 0, len = data.length; i < len; i++) {
                                            node.children.push({
                                                'text': Common.HTMLescape(data[i].name),
                                                'data': {
                                                    'path': node_path + data[i].name + '/',
                                                },
                                                'children': true
                                            });
                                        }
                                    }
                                },
                                complete: function() {
                                    callback(node.children);
                                }
                            });
                        }
                    },
                    'multiple': false, // only 1 folder is allowed to be selected at one time
                    'animation': 100
                }
            })
            .on('select_node.jstree', function(e, data) {
                var node = data.node;
                var repo_id;
                if (node.parents.length == 1) { // parents: ['#']
                    repo_id = node.data.repo_id;
                } else {
                    repo_id = $container.jstree('get_node', node.parents[node.parents.length - 2]).data.repo_id;
                }
                $('input[name="dst_repo"]', $form).val(repo_id);
                $('input[name="dst_path"]', $form).val(node.data.path);
            });
        },

        renderTreeForPath: function(options) {
            var _this = this;
            var $form = options.$form,
                $container = options.$container;

            var repo_name = options.repo_name,
                repo_id = options.repo_id;
            var path = options.path;
            if (path != '/') {
                path += '/';
            }

            var json_data = [];
            var root_node = {
                'text': Common.HTMLescape(repo_name),
                'data': {
                    'repo_id': repo_id,
                    'path': '/'
                },
                'children': [],
                'state': {
                    'opened': true
                }
            };
            json_data.push(root_node);

            $.ajax({
                url: Common.getUrl({name: 'get_dirents', repo_id: repo_id})
                + '?path=' + encodeURIComponent(path) + '&dir_only=true&all_dir=true',
                cache: false,
                dataType: 'json',
                success: function(data) { // data: [{'name': '', 'parent_dir':''}, ...]
                    if (data.length) {
                        var node, node_path;
                        var nodes_with_children = [];
                        for (var i = 0, len = data.length; i < len; i++) {
                            node_path = data[i].parent_dir + data[i].name + '/';
                            node = {
                                'text': Common.HTMLescape(data[i].name),
                                'data': {
                                    'path': node_path
                                }
                            };
                            if (path.indexOf(node_path) == 0) {
                                $.extend(node, {
                                    'children': [],
                                    'state': {
                                        'opened': true
                                    }
                                });
                                nodes_with_children.push(node);
                            } else {
                                $.extend(node, {
                                    'children': true
                                });
                            }
                            if (data[i].parent_dir == '/') {
                                root_node.children.push(node);
                            } else {
                                for (var j = 0, lenn = nodes_with_children.length; j < lenn; j++) {
                                    if (data[i].parent_dir == nodes_with_children[j].data.path) {
                                        nodes_with_children[j].children.push(node);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                },
                complete: function() {
                    _this.renderDirTree($container, $form, json_data);
                }
            });
        },

        prepareOtherReposTree: function(options) {
            var _this = this;

            $('#other-repos .hd').on('click', function() {
                var $span = $('span', $(this)),
                    $form = $('#mv-form'),
                    $loading_tip = $(this).next(),
                    $container = $("#other-repos-dirs");

                if ($span.hasClass('icon-caret-right')) {
                    $span.attr('class','icon-caret-down');
                    $loading_tip.show();
                    $.ajax({
                        url: Common.getUrl({name:'unenc_rw_repos'}),
                        cache: false,
                        dataType: 'json',
                        success: function(data) { // data: [{'id':'', 'name':''}, ...]
                            var other_repos = [];
                            var cur_repo_id = options.cur_repo_id;
                            for (var i = 0, len = data.length; i < len; i++) {
                                if (data[i].id != cur_repo_id) {
                                    other_repos.push({
                                    'text': Common.HTMLescape(data[i].name),
                                    'data': {
                                        'repo_id': data[i].id,
                                        'path': '/'
                                    },
                                    'children': true
                                    });
                                }
                            }
                            _this.renderDirTree($container, $form, other_repos);
                            $container.removeClass('hide');
                        },
                        complete: function() {
                            $loading_tip.hide();
                        }
                    });
                } else {
                    $span.attr('class','icon-caret-right');
                    $container.addClass('hide');
                }
            });
        }
    };

    return FileTree;
});

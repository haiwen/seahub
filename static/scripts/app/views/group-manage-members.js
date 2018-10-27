define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-members',
    'app/views/group-manage-member'
], function($, _, Backbone, Common, GroupMembers, ItemView) {
    'use strict';

    var View = Backbone.View.extend({

        template: _.template($('#group-manage-members-tmpl').html()),

        initialize: function(options) {

            this.group_id = options.group_id;
            this.group_name = options.group_name;
            this.is_owner = options.is_owner;

            this.render();
            // for long group name
            this.$('.op-target').css({'max-width': 270});
            this.$el.modal({
                focus: false,
                containerCss: {
                    'width': 560
                },
                onClose: function() {
                    $(document).off('click', hideRoleEdit);
                    $.modal.close();
                }
            });
            this.$modalContainer = $('#simplemodal-container').css({'height':'auto'});

            this.$('[name="user_name"]').select2($.extend({
                width: '320px',
            }, Common.contactInputOptionsForSelect2()));

            this.collection = new GroupMembers();
            this.listenTo(this.collection, 'add', this.addOne);
            this.renderMemberList();
            this.setConMaxHeight();

            this.$loadingTip = this.$('.loading-tip');
            this.$listContainer = this.$('tbody');
            this.$error = this.$('.error');

            var _this = this;
            $(window).on('resize', function() {
                _this.setConMaxHeight();
            });
            // click other place to hide '.role-edit'
            var hideRoleEdit = function(e) {
                var target = e.target || event.srcElement;
                var $el = _this.$('.role-edit:visible');
                var $td = $el.parent();
                if ($el.length &&
                    !$el.is(target) &&
                    !$el.find('*').is(target) &&
                    !$td.find('.role-edit-icon').is(target)) {
                    $el.hide();
                    $td.find('.cur-role, .role-edit-icon').show();
                }
            };
            $(document).on('click', hideRoleEdit);
        },

        render: function() {
            var title = gettext("{placeholder} Members").replace('{placeholder}', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(this.group_name) + '">' + Common.HTMLescape(this.group_name) + '</span>');
            this.$el.html(this.template({
                title: title,
                is_owner: this.is_owner
            }));

            return this;
        },

        events: {
            'click .invite-link-in-popup': 'closePopup',
            'submit form': 'formSubmit'
        },

        closePopup: function() {
            $.modal.close();
        },

        addOne: function(item, collection, options) {
            var view = new ItemView({
                model: item,
                group_id: this.group_id,
                is_owner: this.is_owner,
                errorContainer: this.$error
            });
            if (options.prepend) {
                this.$listContainer.prepend(view.render().el);
            } else {
                this.$listContainer.append(view.render().el);
            }
        },

        renderMemberList: function() {
            var _this = this;
            this.collection.setGroupId(this.group_id);
            this.collection.fetch({
                cache: false,
                data: {'avatar_size': 40},
                success: function(collection, response, opts) {
                    _this.$loadingTip.hide();
                },
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$loadingTip.hide();
                    _this.$error.html(err_msg).show();
                }
            });
        },

        formSubmit: function() {
            var _this = this;
            var $input = this.$('[name="user_name"]');
            var input_val = $.trim($input.val());
            if (!input_val) {
                return false;
            }
            var input_val_list = input_val.split(',');
            if (input_val_list.length == 1) { // 1 email
                this.collection.create({'email': input_val}, {
                    wait: true,
                    validate: true,
                    prepend: true,
                    success: function() {
                        $input.select2('val', '');
                    },
                    error: function(collection, response, options) {
                        var error_msg = Common.prepareAjaxErrorMsg(response);
                        _this.$error.html(error_msg).show();
                    }
                });
            } else {
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group_member_bulk',
                        'group_id': _this.group_id
                    }),
                    type: 'post',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: {'emails': input_val},
                    success: function(data) { // data: {success, failed}
                        $input.select2('val', '');

                        if (data.success.length > 0) {
                            _this.collection.add(data.success, {prepend: true});
                        }
                        var err_str = '';
                        if (data.failed.length > 0) {
                            $(data.failed).each(function(index, item) {
                                err_str += Common.HTMLescape(item.email_name) + ': ' + Common.HTMLescape(item.error_msg) + '<br />';
                            });
                            _this.$error.html(err_str).show();
                        }
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        _this.$error.html(error_msg).show();
                    }
                });
            }

            return false;
        },

        setConMaxHeight: function() {
            var $modalContainer = this.$modalContainer;
            this.$('.members').css({
                'max-height': $(window).height()
                    - parseInt($modalContainer.css('top'))
                    - parseInt($modalContainer.css('padding-top'))
                    - parseInt($modalContainer.css('padding-bottom'))
                    - this.$('h3').outerHeight(true)
                    - this.$('form').outerHeight(true)
                    - 20, // add some gap between the bottom borders of the popup & the window
                'overflow': 'auto'
            });
        }

    });

    return View;
});

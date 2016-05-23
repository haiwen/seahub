define([
    'underscore',
    'backbone',
    'common',
], function(_, Backbone, Common) {
    'use strict';

    var Device = Backbone.Model.extend({
        unlink: function(options) {
            var data = {
                'platform': this.get('platform'),
                'device_id': this.get('device_id'),
                'user': this.get('user')
            };

            $.ajax({
                url: Common.getUrl({name: 'admin-devices'}),
                type: 'DELETE',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function() {
                    if (options.success) {
                        options.success();
                    }
                },
                error: function(xhr) {
                    if (options.error) {
                        options.error(xhr);
                    }
                }
            });
        },
    });

    return Device;
});

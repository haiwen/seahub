define([
    'underscore',
    'backbone',
    'app/models/group'
], function(_, Backbone, Group) {
    'use strict';

    var GroupCollection = Backbone.Collection.extend({
        model: Group,
        url: app.config.siteRoot + 'api2/groups/?with_msg=false',

        initialize: function() {

        }

    });

    return GroupCollection;
});

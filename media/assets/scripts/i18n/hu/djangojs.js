

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n != 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "%curr% of %total%": "%curr% / %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">A k\u00e9p</a>et nem lehet bet\u00f6lteni.", 
    "Add User": "Felhaszn\u00e1l\u00f3 hozz\u00e1ad\u00e1sa", 
    "Added user {user}": "Felhaszn\u00e1l\u00f3 hozz\u00e1adva: {user}", 
    "Are you sure you want to clear trash?": "Biztos, hogy \u00fcr\u00edti a kuk\u00e1t?", 
    "Are you sure you want to delete %s ?": "Biztosan t\u00f6rli: %s?", 
    "Are you sure you want to delete %s completely?": "Biztos, hogy v\u00e9glegesen t\u00f6rli: %s?", 
    "Are you sure you want to delete all %s's libraries?": "Biztos, hogy t\u00f6rli az \u00f6sszes k\u00f6tetet aminek a tulajdonosa %s?", 
    "Are you sure you want to delete these selected items?": "Biztos, hogy t\u00f6rli ezeket az elemeket?", 
    "Are you sure you want to quit this group?": "Biztosan elhagyja a csoportot?", 
    "Are you sure you want to restore %s?": "Biztos, hogy vissza\u00e1ll\u00edtja: %s?", 
    "Are you sure you want to unlink this device?": "Biztosan sz\u00e9tkapcsolja az eszk\u00f6zt?", 
    "Are you sure you want to unshare %s ?": "Biztosan visszavonja %s megoszt\u00e1s\u00e1t?", 
    "Cancel": "M\u00e9gsem", 
    "Canceled.": "Megszak\u00edtva.", 
    "Change Password of Library {placeholder}": "Jelsz\u00f3 megv\u00e1ltoztat\u00e1sa a k\u00f6tethez:  {placeholder}", 
    "Clear Trash": "Kuka \u00fcr\u00edt\u00e9se", 
    "Close (Esc)": "Bez\u00e1r (Esc)", 
    "Copy selected item(s) to:": "Kiv\u00e1lasztott elem(ek) m\u00e1sol\u00e1sa ide:", 
    "Copy {placeholder} to:": "{placeholder} m\u00e1sol\u00e1sa ide:", 
    "Copying %(name)s": "%(name)s m\u00e1sol\u00e1sa", 
    "Copying file %(index)s of %(total)s": "F\u00e1jlok m\u00e1sol\u00e1sa: %(index)s / %(total)s", 
    "Create Group": "Csoport l\u00e9trehoz\u00e1sa", 
    "Create Library": "K\u00f6tet l\u00e9trehoz\u00e1sa", 
    "Created group {group_name}": "Csoport l\u00e9trehozva: {group_name}", 
    "Created library {library_name} with {owner} as its owner": "{library_name} l\u00e9trehozva. Tulajdonos: {owner}", 
    "Delete": "T\u00f6rl\u00e9s", 
    "Delete Department": "Oszt\u00e1ly t\u00f6rl\u00e9se", 
    "Delete Group": "Csoport t\u00f6rl\u00e9se", 
    "Delete Items": "Elemek t\u00f6rl\u00e9se", 
    "Delete Library": "K\u00f6tet t\u00f6rl\u00e9se", 
    "Delete Library By Owner": "K\u00f6tet t\u00f6rl\u00e9se tulajdonos szerint", 
    "Delete Member": "Tag elt\u00e1vol\u00edt\u00e1sa", 
    "Delete User": "Felhaszn\u00e1l\u00f3 t\u00f6rl\u00e9se", 
    "Delete failed": "A t\u00f6rl\u00e9s meghi\u00fasult", 
    "Delete files from this device the next time it comes online.": "T\u00f6r\u00f6lje a f\u00e1jlokat az eszk\u00f6zr\u0151l, amikor legk\u00f6zelebb online lesz.", 
    "Deleted directories": "T\u00f6r\u00f6lt k\u00f6nyvt\u00e1rak", 
    "Deleted files": "T\u00f6r\u00f6lt f\u00e1jlok", 
    "Deleted group {group_name}": "Csoport t\u00f6r\u00f6lve: {group_name}", 
    "Deleted library {library_name}": "{library_name} k\u00f6tet t\u00f6r\u00f6lve", 
    "Deleted user {user}": "Felhaszn\u00e1l\u00f3 t\u00f6r\u00f6lve: {user}", 
    "Dismiss Group": "Csoport elt\u00fcntet\u00e9se", 
    "Edit failed": "Szerkeszt\u00e9s meghi\u00fasult", 
    "Empty file upload result": "\u00dcres f\u00e1jl felt\u00f6lt\u00e9s", 
    "Encrypted library": "Titkos\u00edtott k\u00f6tet", 
    "Error": "Hiba", 
    "Expired": "Lej\u00e1rt", 
    "Failed to copy %(name)s": "%(name)s m\u00e1sol\u00e1sa sikertelen", 
    "Failed to delete %(name)s and %(amount)s other items.": "%(name)s \u00e9s m\u00e9g %(amount)s m\u00e1sik elem t\u00f6rl\u00e9se sikertelen.", 
    "Failed to delete %(name)s and 1 other item.": "%(name)s \u00e9s m\u00e9g 1 elem t\u00f6rl\u00e9se sikertelen.", 
    "Failed to delete %(name)s.": "T\u00f6rl\u00e9s meghi\u00fasult: %(name)s.", 
    "Failed to move %(name)s": "%(name)s mozgat\u00e1sa sikertelen", 
    "Failed to send to {placeholder}": "Sikertelen k\u00fcld\u00e9s ide: {placeholder}", 
    "Failed.": "Sikertelen.", 
    "Failed. Please check the network.": "Sikertelen. Ellen\u0151rizze a h\u00e1l\u00f3zatot.", 
    "File Upload canceled": "F\u00e1jl felt\u00f6lt\u00e9s megszak\u00edtva", 
    "File Upload complete": "F\u00e1jl felt\u00f6lt\u00e9s k\u00e9sz", 
    "File Upload failed": "F\u00e1jl felt\u00f6lt\u00e9s sikertelen", 
    "File Uploading...": "F\u00e1jl felt\u00f6lt\u00e9s ...", 
    "File is locked": "A f\u00e1jl z\u00e1rolva van", 
    "File is too big": "T\u00fal nagy f\u00e1jl", 
    "File is too small": "T\u00fal kicsi f\u00e1jl", 
    "Filetype not allowed": "Nem enged\u00e9lyezett f\u00e1jlt\u00edpus", 
    "Hide": "Elrejt", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Bels\u0151 hiba. %(name)s m\u00e1sol\u00e1sa \u00e9s m\u00e9g %(amount)s m\u00e1sik elem\u00e9 sikertelen.", 
    "Internal error. Failed to copy %(name)s.": "Bels\u0151 hiba. %(name)s m\u00e1sol\u00e1sa sikertelen.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Bels\u0151 hiba. %(name)s mozgat\u00e1sa \u00e9s m\u00e9g %(amount)s m\u00e1sik elem\u00e9 sikertelen.", 
    "Internal error. Failed to move %(name)s.": "Bels\u0151 hiba. %(name)s mozgat\u00e1sa sikertelen.", 
    "Invalid destination path": "\u00c9rv\u00e9nytelen c\u00e9l \u00fatvonal", 
    "Invalid quota.": "\u00c9rv\u00e9nytelen kv\u00f3ta", 
    "It is required.": "Sz\u00fcks\u00e9ges.", 
    "Just now": "\u00c9ppen most", 
    "Loading failed": "Bet\u00f6lt\u00e9s nem siker\u00fclt", 
    "Loading...": "Bet\u00f6lt\u00e9s...", 
    "Log in": "Bejelentkez\u00e9s", 
    "Maximum number of files exceeded": "F\u00e1jlok maxim\u00e1lis sz\u00e1ma el\u00e9rve", 
    "Modified files": "M\u00f3dos\u00edtott f\u00e1jlok", 
    "Move selected item(s) to:": "Kiv\u00e1lasztott elem(ek) mozgat\u00e1sa ide: ", 
    "Move {placeholder} to:": "{placeholder} mozgat\u00e1sa ide:", 
    "Moving %(name)s": "%(name)s mozgat\u00e1sa", 
    "Moving file %(index)s of %(total)s": "F\u00e1jlok mozgat\u00e1sa: %(index)s / %(total)s", 
    "Name is required": "N\u00e9v sz\u00fcks\u00e9ges", 
    "Name is required.": "N\u00e9v k\u00f6telez\u0151.", 
    "Name should not include '/'.": "N\u00e9v nem tartalmazhat \"/\" jelet.", 
    "New Department": "\u00daj oszt\u00e1ly", 
    "New Excel File": "\u00daj Excel f\u00e1jl", 
    "New File": "\u00daj f\u00e1jl", 
    "New Markdown File": "\u00daj Markdown f\u00e1jl", 
    "New PowerPoint File": "\u00daj PowerPoint f\u00e1jl", 
    "New Sub-department": "\u00daj aloszt\u00e1ly", 
    "New Word File": "\u00daj Word f\u00e1jl", 
    "New directories": "\u00daj k\u00f6nyvt\u00e1rak", 
    "New files": "\u00daj f\u00e1jlok", 
    "New password is too short": "Az \u00faj jelsz\u00f3 r\u00f6vid", 
    "New passwords don't match": "Az \u00faj jelszavak nem egyeznek", 
    "Next (Right arrow key)": "K\u00f6vetkez\u0151 (Jobbra ny\u00edl)", 
    "No matches": "Nincs tal\u00e1lat", 
    "Only an extension there, please input a name.": "Csak a kiterjeszt\u00e9s van, k\u00e9rem adja meg a nevet.", 
    "Open in New Tab": "Megnyit\u00e1s \u00faj f\u00fcl\u00f6n", 
    "Packaging...": "Csomagol\u00e1s", 
    "Password is required.": "Jelsz\u00f3 sz\u00fcks\u00e9ges.", 
    "Password is too short": "A jelsz\u00f3 t\u00fal r\u00f6vid", 
    "Passwords don't match": "Nem egyeznek a megadott jelszavak.", 
    "Permission error": "Jogosults\u00e1g hiba", 
    "Please check the network.": "Ellen\u0151rizze a h\u00e1l\u00f3zatot.", 
    "Please choose a CSV file": "K\u00e9rem v\u00e1lassza ki a CSV f\u00e1jlt", 
    "Please click and choose a directory.": "Kattintson \u00e9s v\u00e1lasszon k\u00f6nyvt\u00e1rat.", 
    "Please enter 1 or more character": "K\u00e9rem adjon meg m\u00e9g 1 vagy t\u00f6bb karaktert", 
    "Please enter a new password": "K\u00e9rem adja meg az \u00faj jelsz\u00f3t", 
    "Please enter days.": "Adja meg a napok sz\u00e1m\u00e1t.", 
    "Please enter password": "K\u00e9rem adja meg a jelsz\u00f3t", 
    "Please enter the new password again": "K\u00e9rem adja meg \u00fajra az \u00faj jelsz\u00f3t", 
    "Please enter the old password": "K\u00e9rem adja meg a r\u00e9gi jelsz\u00f3t", 
    "Please enter the password again": "K\u00e9rem adja meg a jelsz\u00f3t \u00fajra", 
    "Please enter valid days": "K\u00e9rem \u00e9rv\u00e9nyes nap sz\u00e1mot adjon meg", 
    "Please input at least an email.": "Adjon meg legal\u00e1bb egy e-mail c\u00edmet", 
    "Previous (Left arrow key)": "El\u0151z\u0151 (Balra ny\u00edl)", 
    "Processing...": "Feldolgoz\u00e1s...", 
    "Quit Group": "Kil\u00e9p\u00e9s a csoportb\u00f3l", 
    "Read-Only": "Csak olvahat\u00f3", 
    "Read-Only library": "Csak olvashat\u00f3 k\u00f6tet", 
    "Read-Write": "\u00cdr\u00e1s-olvas\u00e1s", 
    "Read-Write library": "\u00cdrhat\u00f3-olvashat\u00f3 k\u00f6tet", 
    "Really want to dismiss this group?": "Biztosan elt\u00fcnteti a csoportot?", 
    "Refresh": "Friss\u00edt\u00e9s", 
    "Removed all items from trash.": "Az \u00f6sszes elem elt\u00e1vol\u00edtva a kuk\u00e1b\u00f3l.", 
    "Removed items older than {n} days from trash.": "{n} napn\u00e1l r\u00e9gebbi elemek elt\u00e1vol\u00edtva a kuk\u00e1b\u00f3l.", 
    "Rename File": "F\u00e1jl \u00e1tnevez\u00e9se", 
    "Rename Folder": "K\u00f6nyvt\u00e1r \u00e1tnevez\u00e9se", 
    "Renamed or Moved files": "\u00c1tnevezett/\u00e1thelyezett f\u00e1jlok", 
    "Replace file {filename}?": "Fel\u00fcl\u00edrja: {filename}?", 
    "Restore Library": "K\u00f6tet vissza\u00e1ll\u00edt\u00e1sa", 
    "Saving...": "Ment\u00e9s...", 
    "Search groups": "Csoportok keres\u00e9se", 
    "Search user or enter email and press Enter": "Felhaszn\u00e1l\u00f3n\u00e9v vagy email c\u00edm szerinti keres\u00e9s, \u00fcss\u00f6n Entert", 
    "Search users or enter emails and press Enter": "Felhaszn\u00e1l\u00f3n\u00e9v vagy email c\u00edm szerinti keres\u00e9s, \u00fcss\u00f6n Entert", 
    "Searching...": "Keres\u00e9s...", 
    "Select a group": "Csoport kiv\u00e1laszt\u00e1sa", 
    "Select groups": "Csoportok kiv\u00e1laszt\u00e1sa", 
    "Set {placeholder}'s permission": "{placeholder} jogosults\u00e1g be\u00e1ll\u00edt\u00e1sa", 
    "Share {placeholder}": "{placeholder} megoszt\u00e1sa", 
    "Show": "Mutat", 
    "Start": "Ind\u00edt", 
    "Success": "Sikeres", 
    "Successfully added label(s) for library {placeholder}": "C\u00edmk\u00e9k hozz\u00e1adva a(z) {placeholder} k\u00f6tethez.", 
    "Successfully changed library password.": "K\u00f6tetjelsz\u00f3 megv\u00e1ltoztat\u00e1sa sikeres", 
    "Successfully clean all errors.": "Minden hiba sikeresen t\u00f6r\u00f6lve.", 
    "Successfully copied %(name)s": "%(name)s m\u00e1sol\u00e1sa sikeres", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s m\u00e1sol\u00e1sa \u00e9s m\u00e9g %(amount)s m\u00e1sik elem\u00e9 sikeres.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s m\u00e1sol\u00e1sa \u00e9s m\u00e9g 1 m\u00e1sik elem\u00e9 sikeres.", 
    "Successfully copied %(name)s.": "%(name)s m\u00e1sol\u00e1sa sikeres.", 
    "Successfully deleted %(name)s": "%(name)s t\u00f6rl\u00e9se sikeres", 
    "Successfully deleted %(name)s and %(amount)s other items.": "%(name)s \u00e9s m\u00e9g %(amount)s m\u00e1sik elem t\u00f6r\u00f6lve.", 
    "Successfully deleted %(name)s and 1 other item.": "%(name)s \u00e9s m\u00e9g 1 m\u00e1sik elem t\u00f6r\u00f6lve.", 
    "Successfully deleted %(name)s.": "%(name)s t\u00f6rl\u00e9se sikeres.", 
    "Successfully deleted 1 item": "1 elem sikeresen t\u00f6r\u00f6lve.", 
    "Successfully deleted 1 item.": "1 elem sikeresen t\u00f6r\u00f6lve.", 
    "Successfully deleted library {placeholder}": "{placeholder} t\u00f6r\u00f6lve", 
    "Successfully deleted member {placeholder}": "{placeholder} elt\u00e1vol\u00edt\u00e1sa sikeres", 
    "Successfully deleted.": "Sikeresen t\u00f6r\u00f6lve.", 
    "Successfully imported.": "Sikeres import\u00e1l\u00e1s.", 
    "Successfully invited %(email) and %(num) other people.": "%(email) \u00e9s tov\u00e1bbi %(num) ember megh\u00edvva.", 
    "Successfully invited %(email).": "%(email) sikeresen megh\u00edvva", 
    "Successfully modified permission": "Enged\u00e9ly sikeresen megv\u00e1ltoztatva.", 
    "Successfully moved %(name)s": "%(name)s sikeresen \u00e1thelyezve", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s \u00e1thelyez\u00e9se \u00e9s m\u00e9g %(amount)s m\u00e1sik elem\u00e9 sikeres.", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s \u00e1thelyez\u00e9se \u00e9s m\u00e9g 1 m\u00e1sik elem\u00e9 sikeres.", 
    "Successfully moved %(name)s.": "%(name)s sikeresen \u00e1tmozgatva.", 
    "Successfully restored library {placeholder}": "{placeholder} vissza\u00e1ll\u00edtva", 
    "Successfully sent to {placeholder}": "Sikeresen elk\u00fcldve ide: {placeholder}", 
    "Successfully set library history.": "K\u00f6tetnapl\u00f3 be\u00e1ll\u00edt\u00e1sa sikeres", 
    "Successfully transferred the group.": "Csoport sikeresen \u00e1tadva.", 
    "Successfully transferred the group. You are now a normal member of the group.": "Sikeresen v\u00e1ltott csoportot. Mostant\u00f3l a csoport rendes tagja.", 
    "Successfully transferred the library.": "K\u00f6tet \u00e1tad\u00e1sa sikeres.", 
    "Successfully unlink %(name)s.": "%(name)s sikeresen sz\u00e9tkapcsolva.", 
    "Successfully unshared 1 item.": "1 megoszt\u00e1s sikeresen megsz\u00fcntetve.", 
    "Successfully unshared library {placeholder}": "{placeholder} megoszt\u00e1sa sikeresen megsz\u00fcntetve", 
    "Successfully unstared {placeholder}": "{placeholder} sikeresen t\u00f6r\u00f6lve a kedvencekb\u0151l", 
    "Tag should not include ','.": "A Tag nem tartalmazhaz ',' karaktert.", 
    "Transfer Group": "Csoport \u00e1tad\u00e1sa", 
    "Transfer Group {group_name} To": "{group_name} csoport \u00e1tad\u00e1sa", 
    "Transfer Library": "K\u00f6tet \u00e1tad\u00e1sa", 
    "Transfer Library {library_name} To": "{library_name} k\u00f6tet \u00e1tad\u00e1sa neki:", 
    "Transferred group {group_name} from {user_from} to {user_to}": "{group_name} csoport \u00faj tulajdonosa {user_to}. R\u00e9gi tulajdonos: {user_from}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "{group_name} k\u00f6tet \u00faj tulajdonosa {user_to}. R\u00e9gi tulajdonos: {user_from}", 
    "Unlink device": "Eszk\u00f6z sz\u00e9tkapcsol\u00e1sa", 
    "Unshare Library": "K\u00f6nyvt\u00e1r megoszt\u00e1s\u00e1nak visszavon\u00e1sa", 
    "Uploaded bytes exceed file size": "A felt\u00f6lt\u00f6tt b\u00e1jtok meghaladj\u00e1k a f\u00e1jl m\u00e9ret\u00e9t", 
    "You can only select 1 item": "Csak 1 elemet v\u00e1laszthat ki", 
    "You cannot select any more choices": "Nem lehet t\u00f6bbet kiv\u00e1lasztani", 
    "You have logged out.": "Sikeresen kijelentkezt\u00e9l.", 
    "canceled": "megszak\u00edtva", 
    "locked by {placeholder}": "z\u00e1rolta: {placeholder}", 
    "uploaded": "felt\u00f6ltve", 
    "{placeholder} Folder Permission": "{placeholder} k\u00f6nyvt\u00e1r jogosults\u00e1ga", 
    "{placeholder} History Setting": "{placeholder} Napl\u00f3be\u00e1ll\u00edt\u00e1sok", 
    "{placeholder} Members": "{placeholder} Tagok", 
    "{placeholder} Share Links": "{placeholder} Megoszt\u00e1si linkek"
  };
  for (var key in newcatalog) {
    django.catalog[key] = newcatalog[key];
  }
  

  if (!django.jsi18n_initialized) {
    django.gettext = function(msgid) {
      var value = django.catalog[msgid];
      if (typeof(value) == 'undefined') {
        return msgid;
      } else {
        return (typeof(value) == 'string') ? value : value[0];
      }
    };

    django.ngettext = function(singular, plural, count) {
      var value = django.catalog[singular];
      if (typeof(value) == 'undefined') {
        return (count == 1) ? singular : plural;
      } else {
        return value[django.pluralidx(count)];
      }
    };

    django.gettext_noop = function(msgid) { return msgid; };

    django.pgettext = function(context, msgid) {
      var value = django.gettext(context + '\x04' + msgid);
      if (value.indexOf('\x04') != -1) {
        value = msgid;
      }
      return value;
    };

    django.npgettext = function(context, singular, plural, count) {
      var value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
      if (value.indexOf('\x04') != -1) {
        value = django.ngettext(singular, plural, count);
      }
      return value;
    };

    django.interpolate = function(fmt, obj, named) {
      if (named) {
        return fmt.replace(/%\(\w+\)s/g, function(match){return String(obj[match.slice(2,-2)])});
      } else {
        return fmt.replace(/%s/g, function(match){return String(obj.shift())});
      }
    };


    /* formatting library */

    django.formats = {
    "DATETIME_FORMAT": "Y. F j. G.i", 
    "DATETIME_INPUT_FORMATS": [
      "%Y.%m.%d. %H.%M.%S", 
      "%Y.%m.%d. %H.%M.%S.%f", 
      "%Y.%m.%d. %H.%M", 
      "%Y.%m.%d.", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "Y. F j.", 
    "DATE_INPUT_FORMATS": [
      "%Y.%m.%d.", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "F j.", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "Y.m.d. G.i", 
    "SHORT_DATE_FORMAT": "Y.m.d.", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "G.i", 
    "TIME_INPUT_FORMATS": [
      "%H.%M.%S", 
      "%H.%M", 
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "Y. F"
  };

    django.get_format = function(format_type) {
      var value = django.formats[format_type];
      if (typeof(value) == 'undefined') {
        return format_type;
      } else {
        return value;
      }
    };

    /* add to global namespace */
    globals.pluralidx = django.pluralidx;
    globals.gettext = django.gettext;
    globals.ngettext = django.ngettext;
    globals.gettext_noop = django.gettext_noop;
    globals.pgettext = django.pgettext;
    globals.npgettext = django.npgettext;
    globals.interpolate = django.interpolate;
    globals.get_format = django.get_format;

    django.jsi18n_initialized = true;
  }

}(this));


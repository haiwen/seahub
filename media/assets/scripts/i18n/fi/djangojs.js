

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
    "%curr% of %total%": "%curr% kokonaism\u00e4\u00e4r\u00e4st\u00e4 %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": " href=\"%url%\" target=\"_blank\">Kuvaa</a> ei voitu ladata.", 
    "Add User": "Lis\u00e4\u00e4 K\u00e4ytt\u00e4j\u00e4", 
    "Added user {user}": "Lis\u00e4tty k\u00e4ytt\u00e4j\u00e4 {user}", 
    "Are you sure you want to clear trash?": "Oletko varma, ett\u00e4 haluat tyhjent\u00e4\u00e4 roskakorin?", 
    "Are you sure you want to delete %s ?": "Haluatko varmasti poistaa %s ?", 
    "Are you sure you want to delete %s completely?": "Oletko varma, ett\u00e4 haluat poistaa %s kokonaan?", 
    "Are you sure you want to delete all %s's libraries?": "Oletko varma, ett\u00e4 haluat poistaa kaikki %s's kirjastot?", 
    "Are you sure you want to delete these selected items?": "Oletko varma, ett\u00e4 haluat poistaa n\u00e4m\u00e4 kohteet?", 
    "Are you sure you want to quit this group?": "Oletko varma, ett\u00e4 haluat lopettaa t\u00e4m\u00e4n ryhm\u00e4n?", 
    "Are you sure you want to restore %s?": "Oletko varma, ett\u00e4 haluat palauttaa %s?", 
    "Are you sure you want to unlink this device?": "Oletko varma, ett\u00e4 haluat poistaa yhdistetyn laitteen?", 
    "Are you sure you want to unshare %s ?": "Oletko varma, ett\u00e4 haluat poistaa jaon %s ?", 
    "Cancel": "Peruuta", 
    "Canceled.": "Peruutettu.", 
    "Change Password of Library {placeholder}": "Vaihda kirjaston {placeholder} salasana", 
    "Clear Trash": "Tyhjenn\u00e4 Roskakori", 
    "Close (Esc)": "Sulje (Esc)", 
    "Copy selected item(s) to:": "Kopioi valitut kohteet:", 
    "Copy {placeholder} to:": "Kopioi {placeholder} kohteeseen:", 
    "Copying %(name)s": "Kopioidaan %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopioidaan tiedostoa %(index)s kokonaism\u00e4\u00e4r\u00e4st\u00e4 %(total)s", 
    "Create Group": "Luo Ryhm\u00e4", 
    "Create Library": "Luo Kirjasto", 
    "Created group {group_name}": "Luotu ryhm\u00e4 {group_name}", 
    "Created library {library_name} with {owner} as its owner": "Kirjasto {library_name} luotu omistajana {owner} ", 
    "Delete": "Poista", 
    "Delete Department": "Poista Osasto.", 
    "Delete Group": "Tuhoa Ryhm\u00e4", 
    "Delete Items": "Poista kohteita", 
    "Delete Library": "Tuhoa Kirjasto", 
    "Delete Library By Owner": "Poista kirjasto omistajalla", 
    "Delete Member": "Poista J\u00e4sen", 
    "Delete User": "Poista k\u00e4ytt\u00e4j\u00e4", 
    "Delete failed": "Poisto ep\u00e4onnistui", 
    "Delete files from this device the next time it comes online.": "Poista tiedostot t\u00e4st\u00e4 laitteesta kun se seuraavan kerran tulee verkkoon.", 
    "Deleted directories": "Poistetut hakemistot", 
    "Deleted files": "Poistetut tiedostot", 
    "Deleted group {group_name}": "Tuhottu ryhm\u00e4 {group_name}", 
    "Deleted library {library_name}": "Poistettu kirjasto {library_name}", 
    "Deleted user {user}": "Poistettu k\u00e4ytt\u00e4j\u00e4 {user}", 
    "Dismiss Group": "Poistu ryhm\u00e4st\u00e4", 
    "Edit failed": "Muokkaus ep\u00e4onnistui", 
    "Empty file upload result": "Tiedoston l\u00e4hetys oli tulokseton", 
    "Encrypted library": "Salattu kirjasto", 
    "Error": "Virhe", 
    "Expired": "Vanhentunut", 
    "Failed to copy %(name)s": "%(name)s kopiointi ep\u00e4onnistui.", 
    "Failed to delete %(name)s and %(amount)s other items.": "Ep\u00e4onnistuttiin poistamaan %(name)s ja %(amount)s muuta kohdetta.", 
    "Failed to delete %(name)s and 1 other item.": "Ep\u00e4onnistuttiin poistamaan %(name)s ja 1 muu kohde.", 
    "Failed to delete %(name)s.": "%(name)s poistaminen ep\u00e4onnistui.", 
    "Failed to move %(name)s": "%(name)s siirt\u00e4minen ep\u00e4onnistui", 
    "Failed to send to {placeholder}": "L\u00e4hett\u00e4minen kohteeseen {placeholder} ep\u00e4onnistui", 
    "Failed.": "Ep\u00e4onnistui.", 
    "Failed. Please check the network.": "Ep\u00e4onnistui. Ole hyv\u00e4 ja tarkista verkkoyhteys.", 
    "File Upload canceled": "Tiedoston l\u00e4hetys peruutettu", 
    "File Upload complete": "Tiedoston l\u00e4hetys valmistui", 
    "File Upload failed": "Tiedoston l\u00e4hetys ep\u00e4onnistui", 
    "File Uploading...": "Tiedostoa l\u00e4hetet\u00e4\u00e4n...", 
    "File is locked": "Tiedosto on lukittu", 
    "File is too big": "Tiedosto on liian suuri", 
    "File is too small": "Tiedosto on liian pieni", 
    "Filetype not allowed": "Tiedostotyyppi ei ole sallittu", 
    "Hide": "Piilota", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Sis\u00e4inen virhe. Ep\u00e4onnistuttiin kopioimaan %(name)s ja %(amount)s muuta kohdetta.", 
    "Internal error. Failed to copy %(name)s.": "Sis\u00e4inen virhe. %(name)s kopiointi ep\u00e4onnistui.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Sis\u00e4inen virhe. Ep\u00e4onnistuttiin siirt\u00e4m\u00e4\u00e4n %(name)s ja %(amount)s muuta kohdetta.", 
    "Internal error. Failed to move %(name)s.": "Sis\u00e4inen virhe. %(name)s siirt\u00e4minen ep\u00e4onnistui.", 
    "Invalid destination path": "Virheellinen kohdepolku", 
    "Invalid quota.": "Virheellinen kiinti\u00f6.", 
    "It is required.": "Vaaditaan", 
    "Just now": "Juuri nyt", 
    "Loading failed": "Lataus ep\u00e4onnistui", 
    "Loading...": "Ladataan...", 
    "Log in": "Kirjaudu sis\u00e4\u00e4n", 
    "Maximum number of files exceeded": "Tiedostojen maksimim\u00e4\u00e4r\u00e4 on ylitetty", 
    "Modified files": "Muokatut tiedostot", 
    "Move selected item(s) to:": "Siirr\u00e4 valitut kohteet:", 
    "Move {placeholder} to:": "Siirr\u00e4 {placeholder} kohteeseen:", 
    "Moving %(name)s": "Siirret\u00e4\u00e4n %(name)s", 
    "Moving file %(index)s of %(total)s": "Siirret\u00e4\u00e4n tiedostoa %(index)s kokonaism\u00e4\u00e4r\u00e4st\u00e4 %(total)s", 
    "Name is required": "Nimi vaaditaan", 
    "Name is required.": "Nimi vaaditaan.", 
    "Name should not include '/'.": "Nimi ei voi sis\u00e4lt\u00e4\u00e4 '/'", 
    "New Department": "Uusi Osasto", 
    "New Excel File": "Uusi Excel tiedosto", 
    "New File": "Uusi Tiedosto", 
    "New Markdown File": "Uusi Markdown tiedosto", 
    "New PowerPoint File": "Uusi PowerPoint tiedosto", 
    "New Sub-department": "Uusi Aliosasto", 
    "New Word File": "Uusi Word tiedosto", 
    "New directories": "Uudet hakemistot", 
    "New files": "Uudet tiedostot", 
    "New password is too short": "Uusi salasana on liian lyhyt", 
    "New passwords don't match": "Uudet salasanat eiv\u00e4t t\u00e4sm\u00e4\u00e4", 
    "Next (Right arrow key)": "Seuraava (Oikea nuolin\u00e4pp\u00e4in)", 
    "No matches": "Ei osumia", 
    "Only an extension there, please input a name.": "Ainoastaan p\u00e4\u00e4tteet t\u00e4h\u00e4n, ole hyv\u00e4 ja anna nimi.", 
    "Open in New Tab": "Avaa uudessa v\u00e4lilehdess\u00e4", 
    "Packaging...": "Pakataan...", 
    "Password is required.": "Salasana vaaditaan", 
    "Password is too short": "Salasana on liian lyhyt", 
    "Passwords don't match": "Salasanat eiv\u00e4t t\u00e4sm\u00e4\u00e4", 
    "Permission error": "Virhe oikeuksissa", 
    "Please check the network.": "Ole hyv\u00e4 ja tarkista verkko.", 
    "Please choose a CSV file": "Ole hyv\u00e4 ja valitse CSV-tiedosto", 
    "Please click and choose a directory.": "Ole hyv\u00e4 ja valitse hakemisto.", 
    "Please enter 1 or more character": "Ole hyv\u00e4 ja sy\u00f6t\u00e4 1 tai useampi merkki", 
    "Please enter a new password": "Ole hyv\u00e4 ja anna uusi salasana", 
    "Please enter days.": "Ole hyv\u00e4 ja sy\u00f6t\u00e4 p\u00e4iv\u00e4t.", 
    "Please enter password": "Ole hyv\u00e4 ja sy\u00f6t\u00e4 salasana", 
    "Please enter the new password again": "Ole hyv\u00e4 ja anna uusi salasana uudelleen", 
    "Please enter the old password": "Ole hyv\u00e4 ja anna vanha salasana", 
    "Please enter the password again": "Ole hyv\u00e4 ja sy\u00f6t\u00e4 salasana uudelleen", 
    "Please enter valid days": "Ole hyv\u00e4 ja sy\u00f6t\u00e4 validit p\u00e4iv\u00e4t", 
    "Please input at least an email.": "Ole hyv\u00e4 ja sy\u00f6t\u00e4 ainakin s\u00e4hk\u00f6posti.", 
    "Previous (Left arrow key)": "Edellinen (Vasen nuolin\u00e4pp\u00e4in)", 
    "Processing...": "K\u00e4sitell\u00e4\u00e4n...", 
    "Quit Group": "Lopeta ryhm\u00e4", 
    "Read-Only": "Vain-Luku", 
    "Read-Only library": "Vain luku kirjasto", 
    "Read-Write": "Luku-Kirjoitus", 
    "Read-Write library": "Luku-kirjoitus kirjasto", 
    "Really want to dismiss this group?": "Haluatko varmasti poistua ryhm\u00e4st\u00e4?", 
    "Refresh": "P\u00e4ivit\u00e4", 
    "Removed all items from trash.": "Poistettu kaikki kohteet roskiksesta.", 
    "Removed items older than {n} days from trash.": "Poistettu kohteita roskiksesta jotka ovat vanhempia kuin {n} p\u00e4iv\u00e4\u00e4.", 
    "Rename File": "Nime\u00e4 tiedosto uudelleen", 
    "Rename Folder": "Nime\u00e4 kansio uudelleen", 
    "Renamed or Moved files": "Uudelleen nimetyt tai siirretyt tiedostot", 
    "Replace file {filename}?": "Korvaa tiedosto {filename}?", 
    "Restore Library": "Palauta Kirjasto", 
    "Saving...": "Tallennetaan...", 
    "Search groups": "Etsi ryhmi\u00e4", 
    "Search user or enter email and press Enter": "Etsi k\u00e4ytt\u00e4j\u00e4 tai sy\u00f6t\u00e4 s\u00e4hk\u00f6posti ja paina Enter", 
    "Search users or enter emails and press Enter": "Etsi k\u00e4ytt\u00e4ji\u00e4 tai sy\u00f6t\u00e4 s\u00e4hk\u00f6postit ja paina Enter", 
    "Searching...": "Etsit\u00e4\u00e4n...", 
    "Select a group": "Valitse ryhm\u00e4", 
    "Select groups": "Valitse ryhm\u00e4t", 
    "Set {placeholder}'s permission": "Aseta oikeudet kohteelle {placeholder} ", 
    "Share {placeholder}": "Jaa {placeholder}", 
    "Show": "N\u00e4yt\u00e4", 
    "Start": "Aloita", 
    "Success": "Onnistui", 
    "Successfully added label(s) for library {placeholder}": "Onnistuneesti lis\u00e4tty etiketti(t) kirjastolle {placeholder}", 
    "Successfully changed library password.": "Kirjaston salasana vaihdettu onnistuneesti.", 
    "Successfully clean all errors.": "Kaikki virheet on poistettu onnistuneesti.", 
    "Successfully copied %(name)s": "Kohde %(name)s kopioitu onnistuneesti", 
    "Successfully copied %(name)s and %(amount)s other items.": "Kopioitiin onnistuneesti %(name)s ja %(amount)s muuta kohdetta.", 
    "Successfully copied %(name)s and 1 other item.": "Kopioitiin onnistuneesti %(name)s ja 1 muu kohde.", 
    "Successfully copied %(name)s.": "%(name)s kopioitiin onnistuneesti.", 
    "Successfully deleted %(name)s": "%(name)s poistettu onnistuneesti", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Poistettu onnistuneesti %(name)s ja %(amount)s muuta kohdetta.", 
    "Successfully deleted %(name)s and 1 other item.": "Poistettu onnistuneesti %(name)s ja 1 muu kohde.", 
    "Successfully deleted %(name)s.": "Poistettu onnistuneesti %(name)s", 
    "Successfully deleted 1 item": "Onnistuneesti tuhottu 1 kohde", 
    "Successfully deleted 1 item.": "Onnistuneesti tuhottu 1 kohde.", 
    "Successfully deleted library {placeholder}": "Onnistuneesti poistettu kirjasto {placeholder}", 
    "Successfully deleted member {placeholder}": "Onnistuneesti poistettu j\u00e4sen {placeholder}", 
    "Successfully deleted.": "Onnistuneesti tuhottu.", 
    "Successfully imported.": "Tuonti onnistui.", 
    "Successfully invited %(email) and %(num) other people.": "Onnistuneesti kutsuttu %(email) ja %(num) muuta k\u00e4ytt\u00e4j\u00e4\u00e4.", 
    "Successfully invited %(email).": "Onnistuneesti kutsuttu %(email).", 
    "Successfully modified permission": "Oikeuksia muokattu onnistuneesti", 
    "Successfully moved %(name)s": "Kohde %(name)s siirretty onnistuneesti", 
    "Successfully moved %(name)s and %(amount)s other items.": "Siirrettiin onnistuneesti %(name)s ja %(amount)s muuta kohdetta.", 
    "Successfully moved %(name)s and 1 other item.": "Siirrettiin onnistuneesti %(name)s ja 1 muu kohde.", 
    "Successfully moved %(name)s.": "%(name)s siirretty onnistuneesti.", 
    "Successfully restored library {placeholder}": "Onnistuneesti palautettu kirjasto {placeholder}", 
    "Successfully sent to {placeholder}": "L\u00e4hetetty onnistuneesti kohteeseen {placeholder}", 
    "Successfully set library history.": "Kirjaston historia asetettu onnistuneesti.", 
    "Successfully transferred the group.": "Ryhm\u00e4 siirrettiin onnistuneesti.", 
    "Successfully transferred the group. You are now a normal member of the group.": "Ryhm\u00e4n vaihto onnistui. Olet nyt ryhm\u00e4n perusk\u00e4ytt\u00e4j\u00e4.", 
    "Successfully transferred the library.": "Kirjasto siirretty onnistuneesti.", 
    "Successfully unlink %(name)s.": "Kohteen %(name)s linkki poistettu onnistuneesti", 
    "Successfully unshared 1 item.": "Onnistuneesti poistettu jako 1 kohteesta.", 
    "Successfully unshared library {placeholder}": "Kirjaston jako {placeholder} poistettiin onnistuneesti", 
    "Successfully unstared {placeholder}": "Suosikki {placeholder} poistettu onnistuneesti", 
    "Tag should not include ','.": "Tagi ei voi sis\u00e4lt\u00e4\u00e4 ','.", 
    "Transfer Group": "Siirr\u00e4 Ryhm\u00e4", 
    "Transfer Group {group_name} To": "Siirr\u00e4 ryhm\u00e4 {group_name}", 
    "Transfer Library": "Siirr\u00e4 Kirjasto", 
    "Transfer Library {library_name} To": "Siirr\u00e4 kirjasto {library_name} kohteeseen", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Siirr\u00e4 ryhm\u00e4 {group_name} k\u00e4ytt\u00e4j\u00e4lt\u00e4 {user_from} k\u00e4ytt\u00e4j\u00e4lle {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "Siirr\u00e4 kirjasto {library_name} k\u00e4ytt\u00e4j\u00e4lt\u00e4 {user_from} k\u00e4ytt\u00e4j\u00e4lle {user_to}", 
    "Unlink device": "Poista yhdistetty laite", 
    "Unshare Library": "Poista kirjaton jako", 
    "Uploaded bytes exceed file size": "L\u00e4htetyt tavut ylitt\u00e4v\u00e4t tiedoston koon", 
    "You can only select 1 item": "Voit valita vain yhden kohteen", 
    "You cannot select any more choices": "Et voi tehd\u00e4 enemp\u00e4\u00e4 valintoja", 
    "You have logged out.": "Olet kirjautunut ulos.", 
    "canceled": "peruutettu", 
    "locked by {placeholder}": "lukittu {placeholder} toimesta", 
    "uploaded": "l\u00e4hetetty", 
    "{placeholder} Folder Permission": "{placeholder} Kansion oikeus", 
    "{placeholder} History Setting": "{placeholder} Historia-asetukset", 
    "{placeholder} Members": "{placeholder} J\u00e4senet", 
    "{placeholder} Share Links": "{placeholder} Jakolinkit"
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
    "DATETIME_FORMAT": "j. E Y \\k\\e\\l\\l\\o G.i", 
    "DATETIME_INPUT_FORMATS": [
      "%d.%m.%Y %H.%M.%S", 
      "%d.%m.%Y %H.%M.%S.%f", 
      "%d.%m.%Y %H.%M", 
      "%d.%m.%Y", 
      "%d.%m.%y %H.%M.%S", 
      "%d.%m.%y %H.%M.%S.%f", 
      "%d.%m.%y %H.%M", 
      "%d.%m.%y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "j. E Y", 
    "DATE_INPUT_FORMATS": [
      "%d.%m.%Y", 
      "%d.%m.%y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j. F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "j.n.Y G.i", 
    "SHORT_DATE_FORMAT": "j.n.Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "G.i", 
    "TIME_INPUT_FORMATS": [
      "%H.%M.%S", 
      "%H.%M.%S.%f", 
      "%H.%M", 
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F Y"
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




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
    "Are you sure you want to delete %s ?": "Esteu segur que voleu eliminar %s ?", 
    "Are you sure you want to delete these selected items?": "Esteu segur que voleu eliminar els elements seleccionats?", 
    "Are you sure you want to quit this group?": "Esteu segur que voleu abandonar aquest grup?", 
    "Are you sure you want to unshare %s ?": "Esteu segur que voleu deixar de compartir %s ?", 
    "Cancel": "Cancela", 
    "Delete": "Elimina", 
    "Delete Group": "Elimina el grup", 
    "Delete Items": "Elimina els elements", 
    "Delete Member": "Elimina membre", 
    "Delete User": "Elimina l'usuari", 
    "Deleted directories": "Directoris eliminats", 
    "Deleted files": "Fitxers eliminats", 
    "Dismiss Group": "Abandona el grup", 
    "Edit Page": "Edita la p\u00e0gina", 
    "Empty file upload result": "S'ha pujat un fitxer buit", 
    "Error": "Error", 
    "Failed.": "Error.", 
    "Failed. Please check the network.": "Error. Verifiqueu la connexi\u00f3 a la xarxa", 
    "File is too big": "El fitxer \u00e9s massa gran", 
    "File is too small": "El fitxer \u00e9s massa petit", 
    "Filetype not allowed": "Aquest tipus de fitxer no est\u00e0 perm\u00e8s", 
    "Internal error. Failed to copy %(name)s.": "Error intern. No s'ha copiat %(name)s.", 
    "Internal error. Failed to move %(name)s.": "Error intern. No s'ha mogut %(name)s.", 
    "Invalid destination path": "La ruta de dest\u00ed no \u00e9s v\u00e0lida", 
    "It is required.": "\u00c9s obligatori.", 
    "Just now": "Ara mateix", 
    "Last Update": "\u00daltima actualitzaci\u00f3", 
    "Loading...": "S'est\u00e0 carregant...", 
    "Log out": "Tanca la sessi\u00f3", 
    "Modified files": "Fitxers modificats", 
    "Name": "Nom", 
    "Name is required": "El nom \u00e9s obligatori", 
    "Name is required.": "El nom \u00e9s obligatori.", 
    "New File": "Crea un fitxer", 
    "New directories": "Directoris nous", 
    "New files": "Fitxers nous", 
    "Only an extension there, please input a name.": "Cal el nom complet, no nom\u00e9s l'extensi\u00f3.", 
    "Pages": "P\u00e0gines", 
    "Password is required.": "Es requereix contrasenya.", 
    "Password is too short": "La contrasenya \u00e9s massa curta", 
    "Passwords don't match": "Les contrasenyes no coincideixen", 
    "Please check the network.": "Verifiqueu la connexi\u00f3 a la xarxa", 
    "Please click and choose a directory.": "Seleccioneu un directori", 
    "Please enter password": "Introdu\u00efu la contrasenya", 
    "Please enter the password again": "Torneu a introduir la contrasenya", 
    "Please input at least an email.": "Introdu\u00efu un correu electr\u00f2nic com a m\u00ednim.", 
    "Processing...": "Processant...", 
    "Quit Group": "Surt del grup", 
    "Read-Only": "Nom\u00e9s lectura", 
    "Read-Write": "Lectura-Escriptura", 
    "Really want to dismiss this group?": "Esteu segur que voleu abandonar el grup?", 
    "Rename": "Reanomena", 
    "Rename File": "Reanomena el fitxer", 
    "Renamed or Moved files": "Fitxers moguts o reanomenats", 
    "Restore Library": "Restaura la llibreria", 
    "Saving...": "Guardant...", 
    "Search files in this wiki": "Cerca fitxers al wiki", 
    "Settings": "Configuraci\u00f3", 
    "Size": "Mida", 
    "Start": "Inicia", 
    "Submit": "Envia", 
    "Successfully copied %(name)s and %(amount)s other items.": "S'ha copiat %(name)s i %(amount)s m\u00e9s.", 
    "Successfully copied %(name)s.": "S'ha copiat %(name)s.", 
    "Successfully deleted %(name)s": "S'ha eliminat %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "S'ha eliminat %(name)s i %(amount)s elements m\u00e9s.", 
    "Successfully deleted %(name)s.": "S'ha eliminat %(name)s.", 
    "Successfully moved %(name)s and %(amount)s other items.": "S'ha mogut %(name)s i %(amount)s m\u00e9s.", 
    "Successfully moved %(name)s.": "S'ha mogut %(name)s.", 
    "System Admin": "Administrador de sistema", 
    "Transfer Library": "Transfereix la llibreria", 
    "Unshare Library": "Deixa de compartir la llibreria", 
    "Uploaded bytes exceed file size": "El total de bytes pujats \u00e9s superior a la mida del fitxer", 
    "Used": "Usat"
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
    "DATETIME_FORMAT": "j \\d\\e F \\d\\e Y \\a \\l\\e\\s G:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%y %H:%M:%S", 
      "%d/%m/%y %H:%M:%S.%f", 
      "%d/%m/%y %H:%M", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "j \\d\\e F \\d\\e Y", 
    "DATE_INPUT_FORMATS": [
      "%d/%m/%Y", 
      "%d/%m/%y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j \\d\\e F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d/m/Y G:i", 
    "SHORT_DATE_FORMAT": "d/m/Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "G:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F \\d\\e\\l Y"
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


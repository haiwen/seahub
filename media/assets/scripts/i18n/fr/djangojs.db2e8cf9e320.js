

(function (globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function (n) {
    var v=(n > 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  
  /* gettext library */

  django.catalog = {
    "%curr% of %total%": "%curr% de %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">L'image</a> ne peut \u00eatre charg\u00e9e.", 
    "Are you sure you want to delete these selected items?": "Voulez vraiment supprimer les \u00e9l\u00e9ments s\u00e9lectionn\u00e9s ?", 
    "Cancel": "Annuler", 
    "Canceled.": "Annul\u00e9.", 
    "Close (Esc)": "Fermer (Esc)", 
    "Copy selected item(s) to:": "Copier les dossiers/fichiers s\u00e9lectionn\u00e9s vers :", 
    "Copy {placeholder} to:": "Copier {placeholder} vers:", 
    "Copying %(name)s": "Copie de %(name)s", 
    "Copying file %(index)s of %(total)s": "Copie du fichier %(index)s de %(total)s", 
    "Delete": "Supprimer", 
    "Delete Items": "Supprimer les \u00e9l\u00e9ments", 
    "Delete failed": "\u00c9chec de la suppression", 
    "Delete succeeded.": "Supprim\u00e9 avec succ\u00e8s.", 
    "Deleted directories": "Dossiers supprim\u00e9s", 
    "Deleted files": "Fichiers supprim\u00e9s", 
    "Edit failed": "\u00c9chec de l'\u00e9dition", 
    "Empty file upload result": "Le r\u00e9sultat de l'envoi est un fichier vide", 
    "Error": "Erreur", 
    "Expired": "Expir\u00e9", 
    "Failed to copy %(name)s": "\u00c9chec de la copie de %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Impossible de supprimer %(name)s et %(amount)s autres \u00e9l\u00e9ments.", 
    "Failed to delete %(name)s and 1 other item.": "Impossible de supprimer %(name)s et un autre \u00e9l\u00e9ment.", 
    "Failed to delete %(name)s.": "Impossible de supprimer %(name)s.", 
    "Failed to get update url": "\u00c9chec de la mise \u00e0 jour de l'url", 
    "Failed to get upload url": "\u00c9chec de la r\u00e9cup\u00e9ration de l'url d'envoi", 
    "Failed to move %(name)s": "\u00c9chec du d\u00e9placement de %(name)s", 
    "Failed to send to {placeholder}": "\u00c9chec de l'envoi \u00e0 {placeholder}", 
    "Failed to share to {placeholder}": "\u00c9chec du partage avec {placeholder}", 
    "Failed.": "\u00c9chec.", 
    "Failed. Please check the network.": "\u00c9chec. V\u00e9rifiez le r\u00e9seau", 
    "File Upload canceled": "Envoi du fichier annul\u00e9", 
    "File Upload complete": "Envoi du fichier termin\u00e9", 
    "File Upload failed": "\u00c9chec de l'envoi du fichier", 
    "File Uploading...": "Envoi du fichier en cours...", 
    "File is locked": "Le fichier est  v\u00e9rouill\u00e9", 
    "File is too big": "Le fichier est trop volumineux", 
    "File is too small": "Le fichier est trop petit", 
    "Filetype not allowed": "Type de fichier non permis", 
    "Hide": "Cacher", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Erreur interne.  \u00c9chec de la copie de %(name)s et %(amount)s autres \u00e9l\u00e9ment(s).", 
    "Internal error. Failed to copy %(name)s.": "Erreur interne.  \u00c9chec de la copie de %(name)s", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Erreur interne.  \u00c9chec du d\u00e9placement de %(name)s et %(amount)s autres \u00e9l\u00e9ment(s).", 
    "Internal error. Failed to move %(name)s.": " Erreur interne.  \u00c9chec du d\u00e9placement de %(name)s ", 
    "Invalid destination path": "Chemin de destination invalide", 
    "It is required.": "c'est obligatoire.", 
    "Just now": "A l'instant", 
    "Loading failed": "Le chargement a \u00e9chou\u00e9", 
    "Loading...": "Chargement...", 
    "Max number of files exceeded": "Le nombre maximal de fichiers est d\u00e9pass\u00e9", 
    "Modified files": "Fichiers modifi\u00e9s", 
    "Move selected item(s) to:": "D\u00e9placer les dossiers/fichiers s\u00e9lectionn\u00e9s vers :", 
    "Move {placeholder} to:": "D\u00e9placer {placeholder} vers :", 
    "Moving %(name)s": "D\u00e9placement de %(name)s", 
    "Moving file %(index)s of %(total)s": "D\u00e9placement du fichier %(index)s de %(total)s", 
    "Name is required": "Le nom est obligatoire", 
    "New directories": "Nouveaux dossiers", 
    "New files": "Nouveaux fichiers", 
    "Next (Right arrow key)": "Suivant (fl\u00e8che droite)", 
    "No matches": "Pas de correspondance", 
    "Only an extension there, please input a name.": "Une seule extension ici, saisissez un nom.", 
    "Open in New Tab": "Ouvrir dans un nouvel onglet", 
    "Password is required.": "Le mot de passe est obligatoire", 
    "Password is too short": "Le mot de passe est trop court", 
    "Passwords don't match": "Les mots de passe ne correspondent pas", 
    "Permission error": "Erreur de droits", 
    "Please check the network.": "V\u00e9rifier le r\u00e9seau.", 
    "Please choose a directory": "Choisissez un r\u00e9pertoire", 
    "Please enter 1 or more character": "Recherche en cours...", 
    "Please enter days.": "Saisissez le nombre de jours.", 
    "Please enter password": "Entrez un mot de passe", 
    "Please enter the password again": "Entrez \u00e0 nouveau un mot de passe", 
    "Please enter valid days": "saisissez un nombre de jours valide", 
    "Please input at least an email.": "Saisissez au moins une adresse mel ", 
    "Previous (Left arrow key)": "Pr\u00e9c\u00e9dent (fl\u00e8che gauche)", 
    "Processing...": "Traitement en cours...", 
    "Really want to delete {lib_name}?": "Confirmez la suppression de {lib_name}?", 
    "Renamed or Moved files": "Fichiers renomm\u00e9s ou d\u00e9plac\u00e9s", 
    "Replace file {filename}?": "Remplacer le fichier {filename}?", 
    "Saving...": "Enregistrement...", 
    "Search users or enter emails": "Rechercher des utilisateurs ou saisir des adresses mail", 
    "Searching...": "Recherche en cours...", 
    "Select groups": "S\u00e9lectionner les groupes", 
    "Set {placeholder}'s permission": "Attribuer des droits \u00e0 {placeholder}'s", 
    "Share {placeholder}": "Partage {placeholder}", 
    "Show": "Afficher", 
    "Start": "D\u00e9marrer", 
    "Success": "Succ\u00e8s", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s et %(amount)s autres \u00e9l\u00e9ments copi\u00e9s avec succ\u00e8s.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s et 1 autre \u00e9l\u00e9ment copi\u00e9s avec succ\u00e8s.", 
    "Successfully copied %(name)s.": "%(name)s copi\u00e9 avec succ\u00e8s.", 
    "Successfully deleted %(name)s": "%(name)s supprim\u00e9 avec succ\u00e8s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Suppression avec succ\u00e8s de %(name)s et  %(amount)s autres \u00e9l\u00e9ments.", 
    "Successfully deleted %(name)s and 1 other item.": " Suppression avec succ\u00e8s de %(name)s et 1 autre \u00e9l\u00e9ment.", 
    "Successfully deleted %(name)s.": " %(name)s supprim\u00e9 avec succ\u00e8s.", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s et %(amount)s autres \u00e9l\u00e9ments d\u00e9plac\u00e9s avec succ\u00e8s.", 
    "Successfully moved %(name)s and 1 other item.": " %(name)s et 1 autre \u00e9l\u00e9ment d\u00e9plac\u00e9s avec succ\u00e8s", 
    "Successfully moved %(name)s.": " %(name)s d\u00e9plac\u00e9 avec succ\u00e8s.", 
    "Successfully sent to {placeholder}": "Succ\u00e8s de l'envoi \u00e0 {placeholder}", 
    "Successfully unshared {placeholder}": "Partage de {placeholder} supprim\u00e9 avec succ\u00e8s", 
    "Successfully unstared {placeholder}": "{placeholder} suppression des favoris", 
    "Uploaded bytes exceed file size": "Le nombre de bytes envoy\u00e9s d\u00e9passe la taille du fichier", 
    "You don't have any library at present.": "Vous n\u2019avez pas actuellement de biblioth\u00e8que. ", 
    "canceled": "annul\u00e9", 
    "locked by {placeholder}": "Verrouill\u00e9 par {placeholder}", 
    "uploaded": "envoy\u00e9"
  };

  django.gettext = function (msgid) {
    var value = django.catalog[msgid];
    if (typeof(value) == 'undefined') {
      return msgid;
    } else {
      return (typeof(value) == 'string') ? value : value[0];
    }
  };

  django.ngettext = function (singular, plural, count) {
    var value = django.catalog[singular];
    if (typeof(value) == 'undefined') {
      return (count == 1) ? singular : plural;
    } else {
      return value[django.pluralidx(count)];
    }
  };

  django.gettext_noop = function (msgid) { return msgid; };

  django.pgettext = function (context, msgid) {
    var value = django.gettext(context + '\x04' + msgid);
    if (value.indexOf('\x04') != -1) {
      value = msgid;
    }
    return value;
  };

  django.npgettext = function (context, singular, plural, count) {
    var value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
    if (value.indexOf('\x04') != -1) {
      value = django.ngettext(singular, plural, count);
    }
    return value;
  };
  

  django.interpolate = function (fmt, obj, named) {
    if (named) {
      return fmt.replace(/%\(\w+\)s/g, function(match){return String(obj[match.slice(2,-2)])});
    } else {
      return fmt.replace(/%s/g, function(match){return String(obj.shift())});
    }
  };


  /* formatting library */

  django.formats = {
    "DATETIME_FORMAT": "j F Y H:i:s", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%Y", 
      "%d.%m.%Y %H:%M:%S", 
      "%d.%m.%Y %H:%M", 
      "%d.%m.%Y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "j F Y", 
    "DATE_INPUT_FORMATS": [
      "%d/%m/%Y", 
      "%d/%m/%y", 
      "%d.%m.%Y", 
      "%d.%m.%y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "j N Y H:i:s", 
    "SHORT_DATE_FORMAT": "j N Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "H:i:s", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F Y"
  };

  django.get_format = function (format_type) {
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

}(this));


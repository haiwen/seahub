

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n > 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "%curr% of %total%": "%curr% de %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">L'image</a> ne peut \u00eatre charg\u00e9e.", 
    "Add User": "Ajouter un utlisateur", 
    "Added user {user}": "Utilisateur {user} ajout\u00e9", 
    "Are you sure you want to clear trash?": "\u00cates-vous certain de vouloir vider la corbeille ?", 
    "Are you sure you want to delete %s ?": "\u00cates-vous certain de vouloir supprimer %s ?", 
    "Are you sure you want to delete %s completely?": "\u00cates-vous certain de vouloir supprimer %s compl\u00e9tement ?", 
    "Are you sure you want to delete all %s's libraries?": "\u00cates-vous certain de vouloir supprimer toutes les biblioth\u00e8ques de %s ?", 
    "Are you sure you want to delete these selected items?": "Voulez-vous vraiment supprimer les \u00e9l\u00e9ments s\u00e9lectionn\u00e9s ?", 
    "Are you sure you want to quit this group?": "\u00cates-vous certain de vouloir quitter ce groupe ?", 
    "Are you sure you want to restore %s?": "\u00cates-vous certain de vouloir restaurer %s ?", 
    "Are you sure you want to unlink this device?": "\u00cates-vous certain de vouloir supprimer le lien de l'appareil ?", 
    "Are you sure you want to unshare %s ?": "\u00cates-vous certain de ne plus vouloir partager %s ?", 
    "Cancel": "Annuler", 
    "Canceled.": "Annul\u00e9.", 
    "Change Password of Library {placeholder}": "Changement du mot de passe de la biblioth\u00e8que {placeholder}", 
    "Clear Trash": "Vider la corbeille", 
    "Close (Esc)": "Fermer (\u00c9chap)", 
    "Copy selected item(s) to:": "Copier les dossiers/fichiers s\u00e9lectionn\u00e9s vers :", 
    "Copy {placeholder} to:": "Copier {placeholder} vers :", 
    "Copying %(name)s": "Copie de %(name)s", 
    "Copying file %(index)s of %(total)s": "Copie du fichier %(index)s de %(total)s", 
    "Create Group": "Cr\u00e9er un groupe", 
    "Create Library": "Cr\u00e9er une biblioth\u00e8que", 
    "Created group {group_name}": "Groupe {group_name} cr\u00e9\u00e9", 
    "Created library {library_name} with {owner} as its owner": "Biblioth\u00e8que {library_name} cr\u00e9\u00e9e par {owner} en tant que propri\u00e9taire", 
    "Delete": "Supprimer", 
    "Delete Department": "Supprimer le D\u00e9partement", 
    "Delete Group": "Supprimer un groupe", 
    "Delete Items": "Supprimer les \u00e9l\u00e9ments", 
    "Delete Library": "Supprimer une biblioth\u00e8que", 
    "Delete Library By Owner": "Supprimer une biblioth\u00e8que par propri\u00e9taire", 
    "Delete Member": "Supprimer le membre", 
    "Delete User": "Supprimer un utilisateur", 
    "Delete failed": "\u00c9chec de la suppression", 
    "Delete files from this device the next time it comes online.": "Supprimer les fichiers de cet appareil la prochaine fois qu'il est en ligne.", 
    "Deleted directories": "Dossiers supprim\u00e9s", 
    "Deleted files": "Fichiers supprim\u00e9s", 
    "Deleted group {group_name}": "Groupe {group_name} supprim\u00e9", 
    "Deleted library {library_name}": "Biblioth\u00e8que {library_name} supprim\u00e9e", 
    "Deleted user {user}": "Utilisateur {user} supprim\u00e9", 
    "Dismiss Group": "Supprimer le groupe", 
    "Edit failed": "\u00c9chec de l'\u00e9dition", 
    "Empty file upload result": "Le r\u00e9sultat de l'envoi est un fichier vide", 
    "Encrypted library": "Biblioth\u00e8que crypt\u00e9e", 
    "Error": "Erreur", 
    "Expired": "Expir\u00e9", 
    "Failed to copy %(name)s": "\u00c9chec de la copie de %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Impossible de supprimer %(name)s et %(amount)s autres \u00e9l\u00e9ments.", 
    "Failed to delete %(name)s and 1 other item.": "Impossible de supprimer %(name)s et un autre \u00e9l\u00e9ment.", 
    "Failed to delete %(name)s.": "Impossible de supprimer %(name)s.", 
    "Failed to move %(name)s": "\u00c9chec du d\u00e9placement de %(name)s", 
    "Failed to send to {placeholder}": "\u00c9chec de l'envoi \u00e0 {placeholder}", 
    "Failed.": "\u00c9chec.", 
    "Failed. Please check the network.": "\u00c9chec. Veuillez v\u00e9rifier le r\u00e9seau.", 
    "File Upload canceled": "Envoi du fichier annul\u00e9", 
    "File Upload complete": "Envoi du fichier termin\u00e9", 
    "File Upload failed": "\u00c9chec de l'envoi du fichier", 
    "File Uploading...": "Envoi du fichier en cours ...", 
    "File is locked": "Le fichier est verrouill\u00e9", 
    "File is too big": "Le fichier est trop gros", 
    "File is too small": "Le fichier est trop petit", 
    "Filetype not allowed": "Type de fichier non autoris\u00e9", 
    "Hide": "Cacher", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Erreur interne.  \u00c9chec de la copie de %(name)s et %(amount)s autres \u00e9l\u00e9ment(s).", 
    "Internal error. Failed to copy %(name)s.": "Erreur interne.  \u00c9chec de la copie de %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Erreur interne.  \u00c9chec du d\u00e9placement de %(name)s et %(amount)s autre(s) \u00e9l\u00e9ment(s).", 
    "Internal error. Failed to move %(name)s.": " Erreur interne.  \u00c9chec du d\u00e9placement de %(name)s.", 
    "Invalid destination path": "Chemin de destination invalide", 
    "Invalid quota.": "Quota invalide", 
    "It is required.": "C'est obligatoire.", 
    "Just now": "\u00c0 l'instant", 
    "Loading failed": "Le chargement a \u00e9chou\u00e9", 
    "Loading...": "Chargement ...", 
    "Log in": "Connexion", 
    "Maximum number of files exceeded": "Le nombre maximal de fichiers a \u00e9t\u00e9 atteint", 
    "Modified files": "Fichiers modifi\u00e9s", 
    "Move selected item(s) to:": "D\u00e9placer les dossiers/fichiers s\u00e9lectionn\u00e9s vers :", 
    "Move {placeholder} to:": "D\u00e9placer {placeholder} vers :", 
    "Moving %(name)s": "D\u00e9placement de %(name)s", 
    "Moving file %(index)s of %(total)s": "D\u00e9placement du fichier %(index)s de %(total)s", 
    "Name is required": "Le nom est obligatoire", 
    "Name is required.": "Le nom est requis.", 
    "Name should not include '/'.": "Le nom ne peut inclure '/'.", 
    "New Department": "Nouveau d\u00e9partement", 
    "New Excel File": "Nouveau fichier Excel", 
    "New File": "Nouveau fichier", 
    "New Markdown File": "Nouveau fichier Markdown", 
    "New PowerPoint File": "Nouveau fichier PowerPoint.", 
    "New Sub-department": "Nouveau sous-d\u00e9partement", 
    "New Word File": "Nouveau fichier Word", 
    "New directories": "Nouveaux dossiers", 
    "New files": "Nouveaux fichiers", 
    "New password is too short": "Le nouveau mot de passe est trop court", 
    "New passwords don't match": "Les nouveaux mots de passe ne correspondent pas", 
    "Next (Right arrow key)": "Suivant (Fl\u00e8che droite)", 
    "No matches": "Pas de correspondance", 
    "Only an extension there, please input a name.": "Une seule extension ici, saisissez un nom.", 
    "Open in New Tab": "Ouvrir dans un nouvel onglet", 
    "Packaging...": "Packaging ...", 
    "Password is required.": "Le mot de passe est obligatoire.", 
    "Password is too short": "Le mot de passe est trop court", 
    "Passwords don't match": "Les mots de passe ne correspondent pas", 
    "Permission error": "Erreur de droits", 
    "Please check the network.": "Veuillez v\u00e9rifier le r\u00e9seau.", 
    "Please choose a CSV file": "Veuillez choisir un fichier CSV", 
    "Please click and choose a directory.": "Veuillez cliquer puis choisir un dossier.", 
    "Please enter 1 or more character": "Saisir un 1 caract\u00e8re ou plus ", 
    "Please enter a new password": "Veuillez entrer un nouveau mot de passe", 
    "Please enter days.": "Saisissez le nombre de jours.", 
    "Please enter password": "Entrez un mot de passe", 
    "Please enter the new password again": "Veuillez entrer le nouveau mot de passe encore une fois", 
    "Please enter the old password": "Veuillez entrer l'ancien mot de passe", 
    "Please enter the password again": "Entrez \u00e0 nouveau un mot de passe", 
    "Please enter valid days": "saisissez un nombre de jours valide", 
    "Please input at least an email.": "Saisissez au moins une adresse e-mail.", 
    "Previous (Left arrow key)": "Pr\u00e9c\u00e9dent (Fl\u00e8che gauche)", 
    "Processing...": "Traitement en cours ...", 
    "Quit Group": "Quitter le groupe", 
    "Read-Only": "Lecture seulement", 
    "Read-Only library": "Biblioth\u00e8que en lecture seule", 
    "Read-Write": "Lecture - \u00c9criture", 
    "Read-Write library": "Biblioth\u00e8que en lecture / \u00e9criture", 
    "Really want to dismiss this group?": "Voulez-vous r\u00e9ellement supprimer ce groupe ?", 
    "Refresh": "Rafraichir", 
    "Removed all items from trash.": "Supprimer tous les \u00e9l\u00e9ments de la corbeille.", 
    "Removed items older than {n} days from trash.": "Supprimer les \u00e9l\u00e9ments datant de plus {n} jours.", 
    "Rename File": "Renommer le fichier", 
    "Rename Folder": "Renommer le dossier", 
    "Renamed or Moved files": "Fichiers renomm\u00e9s ou d\u00e9plac\u00e9s", 
    "Replace file {filename}?": "Remplacer le fichier {filename} ?", 
    "Restore Library": "Restaurer la biblioth\u00e8que", 
    "Saving...": "Sauvegarde ...", 
    "Search groups": "Recherche de groupes", 
    "Search user or enter email and press Enter": "Rechercher un utilisateur ou entrer un e-mail et presser Entr\u00e9e", 
    "Search users or enter emails and press Enter": "Rechercher des utilisateurs ou entrer les e-mails et appuyer sur Entr\u00e9e", 
    "Searching...": "Recherche en cours ...", 
    "Select a group": "S\u00e9lectionner un groupe", 
    "Select groups": "S\u00e9lectionner les groupes", 
    "Set {placeholder}'s permission": "Attribuer des droits \u00e0 {placeholder}'s", 
    "Share {placeholder}": "Partage {placeholder}", 
    "Show": "Afficher", 
    "Smart link copied to clipboard": "Lien intelligent copi\u00e9 dans le presse-papier", 
    "Start": "D\u00e9marrer", 
    "Success": "Succ\u00e8s", 
    "Successfully added label(s) for library {placeholder}": "Le(s) label(s) de la biblioth\u00e8que {placeholder} a \u00e9t\u00e9 ajout\u00e9 avec succ\u00e8s", 
    "Successfully changed library password.": "Le mot de passe de la biblioth\u00e8que a \u00e9t\u00e9 modifi\u00e9 avec succ\u00e8s.", 
    "Successfully clean all errors.": "Toutes les erreurs ont \u00e9t\u00e9 effac\u00e9es avec succ\u00e8s.", 
    "Successfully copied %(name)s": " %(name)s copi\u00e9 avec succ\u00e8s", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s et %(amount)s autres \u00e9l\u00e9ments copi\u00e9s avec succ\u00e8s.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s et 1 autre \u00e9l\u00e9ment copi\u00e9s avec succ\u00e8s.", 
    "Successfully copied %(name)s.": "%(name)s copi\u00e9 avec succ\u00e8s.", 
    "Successfully deleted %(name)s": "%(name)s supprim\u00e9 avec succ\u00e8s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Suppression de %(name)s et  %(amount)s autres \u00e9l\u00e9ments avec succ\u00e8s.", 
    "Successfully deleted %(name)s and 1 other item.": " Suppression de %(name)s et 1 autre \u00e9l\u00e9ment avec succ\u00e8s.", 
    "Successfully deleted %(name)s.": " %(name)s supprim\u00e9 avec succ\u00e8s.", 
    "Successfully deleted 1 item": "1 objet supprim\u00e9 avec succ\u00e8s", 
    "Successfully deleted 1 item.": "1 objet supprim\u00e9 avec succ\u00e8s.", 
    "Successfully deleted library {placeholder}": "La biblioth\u00e8que {placeholder} a \u00e9t\u00e9 supprim\u00e9e avec succ\u00e8s", 
    "Successfully deleted member {placeholder}": "Le membre {placeholder} a \u00e9t\u00e9 supprim\u00e9 avec succ\u00e8s.", 
    "Successfully deleted.": "Supprim\u00e9e avec succ\u00e8s.", 
    "Successfully imported.": "Import\u00e9 avec succ\u00e8s.", 
    "Successfully invited %(email) and %(num) other people.": "%(email) et %(num) ont \u00e9t\u00e9 invit\u00e9 avec succ\u00e8s.", 
    "Successfully invited %(email).": "%(email) invit\u00e9 avec succ\u00e8s", 
    "Successfully modified permission": "Permission modifi\u00e9e avec succ\u00e8s", 
    "Successfully moved %(name)s": " %(name)s d\u00e9plac\u00e9 avec succ\u00e8s", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s et %(amount)s autres \u00e9l\u00e9ments d\u00e9plac\u00e9s avec succ\u00e8s.", 
    "Successfully moved %(name)s and 1 other item.": " %(name)s et 1 autre \u00e9l\u00e9ment d\u00e9plac\u00e9s avec succ\u00e8s.", 
    "Successfully moved %(name)s.": " %(name)s d\u00e9plac\u00e9 avec succ\u00e8s.", 
    "Successfully restored library {placeholder}": "La biblioth\u00e8que {placeholder} a \u00e9t\u00e9 restaur\u00e9e avec succ\u00e8s", 
    "Successfully sent to {placeholder}": "Envoy\u00e9 \u00e0 {placeholder} avec succ\u00e8s", 
    "Successfully set library history.": "Mise \u00e0 jour de l'historique de la biblioth\u00e8que avec succ\u00e8s.", 
    "Successfully transferred the group.": "Groupe transf\u00e9r\u00e9 avec succ\u00e8s.", 
    "Successfully transferred the group. You are now a normal member of the group.": "Transf\u00e9r\u00e9 dans un groupe avec succ\u00e8s. Vous \u00eates \u00e0 pr\u00e9sent un membre standard du groupe.", 
    "Successfully transferred the library.": "Biblioth\u00e8que transf\u00e9r\u00e9e avec succ\u00e8s.", 
    "Successfully unlink %(name)s.": "Le lien %(name)s a \u00e9t\u00e9 annul\u00e9 avec succ\u00e8s.", 
    "Successfully unshared 1 item.": "1 objet a \u00e9t\u00e9 retir\u00e9 des partages avec succ\u00e8s.", 
    "Successfully unshared library {placeholder}": "Le partage de {placeholder} a \u00e9t\u00e9 supprim\u00e9 avec succ\u00e8s", 
    "Successfully unstared {placeholder}": "{placeholder} supprim\u00e9 des favoris avec succ\u00e8s.", 
    "Tag should not include ','.": "Le Tag ne peut inclure ','.", 
    "Transfer Group": "Transf\u00e9rer un groupe", 
    "Transfer Group {group_name} To": "Transf\u00e9rer le groupe {group_name} \u00e0", 
    "Transfer Library": "Transf\u00e9rer un biblioth\u00e8que", 
    "Transfer Library {library_name} To": "Transf\u00e9rer la biblioth\u00e8que {library_name} \u00e0", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Le groupe {group_name} a \u00e9t\u00e9 transf\u00e9r\u00e9 de {user_from} \u00e0 {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "La biblioth\u00e8que {library_name} a \u00e9t\u00e9 transf\u00e9r\u00e9e de {user_from} \u00e0 {user_to}", 
    "Unlink device": "Supprimer le lien de l'appareil", 
    "Unshare Library": "Biblioth\u00e8que non partag\u00e9e", 
    "Uploaded bytes exceed file size": "Le nombre de bytes envoy\u00e9s d\u00e9passe la taille du fichier", 
    "You can only select 1 item": "Vous ne pouvez s\u00e9lectionner qu'un seul \u00e9l\u00e9ment", 
    "You cannot select any more choices": "Vous ne pouvez pas s\u00e9lectionner plus de choix", 
    "You have logged out.": "Vous \u00eates d\u00e9connect\u00e9.", 
    "canceled": "annul\u00e9", 
    "locked by {placeholder}": "Verrouill\u00e9 par {placeholder}", 
    "uploaded": "envoy\u00e9", 
    "{placeholder} Folder Permission": "Droits sur le dossier {placeholder}", 
    "{placeholder} History Setting": "Param\u00e8tre de l'historique {placeholder}", 
    "{placeholder} Members": "Membres de {placeholder}", 
    "{placeholder} Share Links": "Liens de partage pour {placeholder}"
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
    "DATETIME_FORMAT": "j F Y H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%Y", 
      "%d.%m.%Y %H:%M:%S", 
      "%d.%m.%Y %H:%M:%S.%f", 
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
    "SHORT_DATETIME_FORMAT": "j N Y H:i", 
    "SHORT_DATE_FORMAT": "j N Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "H:i", 
    "TIME_INPUT_FORMATS": [
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


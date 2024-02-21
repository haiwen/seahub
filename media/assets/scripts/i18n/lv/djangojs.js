

'use strict';
{
  const globals = this;
  const django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    const v = (n%10==1 && n%100!=11 ? 0 : n != 0 ? 1 : 2);
    if (typeof v === 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  const newcatalog = {
    "(current notification)": "(pa\u0161reiz\u0113jais pazi\u0146ojums)",
    "(current version)": "(pa\u0161reiz\u0113j\u0101 versija)",
    "1 Year": "1 gads",
    "1 month ago": "Pirms 1 m\u0113ne\u0161a",
    "1 week ago": "Pirms 1 ned\u0113\u013cas",
    "3 days ago": "Pirms 3 dien\u0101m",
    "30 Days": "30 dienas",
    "7 Days": "7 dienas",
    "A file with the same name already exists in this folder.": "Datne ar t\u0101du pa\u0161u nosaukumu jau eksist\u0113 \u0161aj\u0101 map\u0113.",
    "About": "Par",
    "About Us": "Par mums",
    "Accept": "Piekrist",
    "Accepted": "Pie\u0146emt",
    "Access Log": "Piek\u013cuves \u017eurn\u0101ls",
    "Actions": "Darb\u012bbas",
    "Activated": "Aktiviz\u0113t",
    "Active": "Akt\u012bvs",
    "Active Users": "Akt\u012bvie lietot\u0101ji",
    "Activities": "Aktivit\u0101tes",
    "Add": "Pievienot",
    "Add Admins": "Pievienot administratoru",
    "Add Library": "Pievienot bibliot\u0113ku",
    "Add Member": "Pievienot dal\u012bbnieku",
    "Add Terms and Conditions": "Pievienot noteikumus un nosac\u012bjumus",
    "Add a comment...": "Pievienot koment\u0101ru...",
    "Add admin": "Pievienot administratoru",
    "Add auto expiration": "Pievienot autom\u0101tisko izbeig\u0161anos",
    "Add institution": "Pievienot instit\u016bciju",
    "Add new notification": "Pievienot jaunu pazi\u0146ojumu",
    "Add password protection": "Pievienot paroles aizsardz\u012bbu",
    "Added": "Pievienots",
    "Admin": "Administrators",
    "Admins": "Administrators",
    "All": "Visi",
    "All Groups": "Visas grupas",
    "All Notifications": "Visi pazi\u0146ojumi",
    "All Public Links": "Visas publisk\u0101s saites",
    "All file types": "Visi datnes tipi",
    "Anonymous User": "Anon\u012bms lietot\u0101js",
    "Are you sure you want to clear trash?": "Vai tie\u0161\u0101m v\u0113laties t\u012br\u012bt atkritni?",
    "Are you sure you want to delete %s ?": "Tie\u0161\u0101m dz\u0113st %s ?",
    "Are you sure you want to restore this library?": "Vai tie\u0161\u0101m v\u0113laties atjaunot \u0161\u014d bibliot\u0113ku?",
    "Are you sure you want to unlink this device?": "Vai tie\u0161\u0101m v\u0113laties no\u0146emt \u0161o ier\u012bci?",
    "Audio": "Audio",
    "Avatar": "Avatars",
    "Avatar:": "Avatars: ",
    "Back": "Atpaka\u013c",
    "Broken (please contact your administrator to fix this library)": "Boj\u0101ta (l\u016bdzu, sazinieties ar administratoru, lai salabotu \u0161o bibliot\u0113ku)",
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Nevar kop\u0113t mapi %(src)s t\u0101s apak\u0161map\u0113 %(des)s",
    "Can not move directory %(src)s to its subdirectory %(des)s": "Nevar p\u0101rvietot mapi %(src)s t\u0101s apak\u0161map\u0113 %(des)s",
    "Cancel": "Atcelt",
    "Cancel All": "Atcelt visus",
    "Change": "Main\u012bt",
    "Change Password": "Main\u012bt paroli",
    "Change Password of Library {placeholder}": "Main\u012bt bibliot\u0113kas paroli {placeholder}",
    "Clean": "T\u012br\u012bt",
    "Clear": "T\u012brs",
    "Clear Trash": "T\u012br\u012bt miskasti",
    "Clear files in trash and history\uff1a": "T\u012br\u012bt datnes atkritn\u0113 un v\u0113stur\u0113: ",
    "Clients": "Klienti",
    "Close": "Aizv\u0113rt",
    "Comment": "Koment\u0101rs",
    "Comments": "Koment\u0101ri",
    "Community Edition": "Community Edition",
    "Confirm Password": "Apstiprin\u0101t paroli",
    "Contact Email": "Kontaktpersonas e-pasts:",
    "Contact Email:": "Kontaktpersonas e-pasts:",
    "Copy": "Kop\u0113t",
    "Copy selected item(s) to:": "Kop\u0113t atlas\u012bto(s) ierakstu(s) uz:",
    "Count": "Skait\u012bt",
    "Create": "Izveidot",
    "Created": "Izveidoja",
    "Created At": "Izveidoja",
    "Created library": "Kr\u0101tuve izveidota",
    "Creator": "Autors",
    "Current Connected Devices": "Tagad savienotas ier\u012bces",
    "Current Library": "Pa\u0161reiz\u0113j\u0101 bibliot\u0113ka",
    "Current Path: ": "Pa\u0161reiz\u0113jais ce\u013c\u0161:",
    "Current Version": "Pa\u0161reiz\u0113j\u0101 versija",
    "Current path: ": "Atrodaties map\u0113: ",
    "Custom file types": "Piel\u0101gots datnes tips",
    "Database": "Datub\u0101ze",
    "Date": "Datums",
    "Default": "Noklus\u0113ts",
    "Delete": "Dz\u0113st",
    "Delete Account": "Dz\u0113st kontu",
    "Delete Group": "Dz\u0113st grupu",
    "Delete Institution": "Dz\u0113st instit\u016bciju",
    "Delete Library": "Dz\u0113st bibliot\u0113ku",
    "Delete Member": "Dz\u0113st biedru",
    "Delete Notification": "Dz\u0113st pazi\u0146ojumu",
    "Delete Organization": "Dz\u0113st organiz\u0101ciju",
    "Delete Time": "Dz\u0113st laiku",
    "Delete User": "Dz\u0113st lietot\u0101ju",
    "Delete files from this device the next time it comes online.": "Datnes tiks dz\u0113stas no ier\u012bces, n\u0101kamreiz non\u0101kot tie\u0161saist\u0113.",
    "Deleted": "Dz\u0113sts",
    "Deleted Libraries": "Dz\u0113st\u0101s bibliot\u0113kas",
    "Deleted Time": "Dz\u0113\u0161anas laiks",
    "Deleted directories": "Dz\u0113st\u0101s mapes",
    "Deleted files": "Dz\u0113st datnes",
    "Deleted library": "Dz\u0113st\u0101s bibliot\u0113kas",
    "Description": "Apraksts",
    "Description is required": "Nepiecie\u0161ams apraksts",
    "Desktop": "Darbvirsma",
    "Detail": "Deta\u013cas",
    "Details": "Deta\u013cas",
    "Device": "Ier\u012bce",
    "Device Name": "Ier\u012bces nosaukums",
    "Devices": "Ier\u012bces",
    "Directory": "Mape",
    "Disable Two-Factor Authentication": "Atsp\u0113jot divfaktoru autentifik\u0101cija",
    "Document convertion failed.": "Dokumentu konvert\u0113\u0161anas k\u013c\u016bme.",
    "Documents": "Dokumentus",
    "Don't keep history": "Negrab\u0101t v\u0113sturi",
    "Don't replace": "Neaizst\u0101t",
    "Download": "Lejupl\u0101d\u0113t",
    "Edit": "Main\u012bt",
    "Edit succeeded": "Redi\u0123\u0113\u0161ana izdev\u0101s",
    "Email": "E-pasts",
    "Enable Two-Factor Authentication": "Aktiviz\u0113t divfaktoru autentifik\u0101cija",
    "Encrypt": "\u0160ifr\u0113t",
    "Encrypted library": "\u0160ifr\u0113ta bibliot\u0113ka",
    "Error": "K\u013c\u016bda",
    "Errors": "K\u013c\u016bdas",
    "Exit System Admin": "Iziet no administratora loga",
    "Expiration": "Izbeig\u0161an\u0101s",
    "Expired": "Beigties",
    "Export Excel": "Eksport\u0113t Excel",
    "Failed": "Neizdev\u0101s",
    "Failed to copy %(name)s": "K\u013c\u016bda kop\u0113jot %(name)s.",
    "Failed. Please check the network.": "Neizdev\u0101s. L\u016bdzu p\u0101rbaudiet t\u012bkla piesl\u0113gumu.",
    "Favorites": "Favor\u012bti",
    "File": "Datne",
    "File Upload": "Datni aug\u0161upl\u0101d\u0113t",
    "File Uploading...": "Datni aug\u0161upl\u0101d\u0113...",
    "Files": "Datnes",
    "Folder": "Mape",
    "Folder Permission": "Mapes ties\u012bbas",
    "Folders": "Mapes",
    "Generate": "Izveidot",
    "Grid": "Re\u017e\u0123is",
    "Group": "Grupa",
    "Group Permission": "Grupas ties\u012bbas",
    "Groups": "Grupas",
    "Guest": "Viesis",
    "Handled": "Apstr\u0101d\u0101ts",
    "Help": "Pal\u012bdz\u012bba",
    "Hide": "Sl\u0113pt",
    "History": "V\u0113sture",
    "History Setting": "V\u0113stures iestat\u012bjumi",
    "IP": "IP adrese",
    "Image": "Att\u0113ls",
    "Images": "Att\u0113ls",
    "Import Members": "Import\u0113t dal\u012bbniekus",
    "In all libraries": "vis\u0101s bibliot\u0113k\u0101s",
    "Inactive": "Neakt\u012bvs",
    "Info": " Inform\u0101cija",
    "Input file extensions here, separate with ','": "Ievadiet datnes papla\u0161in\u0101jumus \u0161eit, atdalot ar ','",
    "Institutions": "Instit\u016bcija",
    "Internal Server Error": "Iek\u0161\u0113j\u0101 servera k\u013c\u016bda",
    "Invalid destination path": "Neder\u012bgs m\u0113r\u0137a ce\u013c\u0161",
    "Invitations": "Iel\u016bgumi",
    "Invite Time": "Uzaicin\u0101\u0161anas laiks",
    "Inviter": "Uzaicin\u0101t\u0101js",
    "It is required.": "Nepiecie\u0161ams.",
    "Keep full history": "Glab\u0101t pilnu v\u0113sturi",
    "LDAP": "LDAP",
    "LDAP(imported)": "LDAP(import\u0113ts)",
    "Language": "Valoda",
    "Language Setting": "Valodas iestat\u012bjumi",
    "Last Access": "P\u0113d\u0113j\u0101 piek\u013cuve",
    "Last Login": "P\u0113d\u0113j\u0101 pieteik\u0161an\u0101s",
    "Last Update": "Atjaunots",
    "Leave Share": "At\u013cauja koplietojumam",
    "Libraries": "Kr\u0101tuves",
    "Library": "Kr\u0101tuve",
    "Library Type": "Bibliot\u0113kas tips",
    "Limits": "Ierobe\u017eojumi",
    "Link": "Saite",
    "Linked Devices": "Saist\u012bt\u0101s ier\u012bces",
    "Links": "Saites",
    "List": "Saraksts",
    "Lock": "Blo\u0137\u0113t",
    "Log out": "Iziet",
    "Logs": "\u017durn\u0101ls",
    "Manage Members": "P\u0101rvald\u012bt dal\u012bbniekus",
    "Mark all read": "Atz\u012bm\u0113t visas izlas\u012btas",
    "Member": "Dal\u012bbnieks",
    "Members": "Biedri",
    "Message": "Zi\u0146a",
    "Message (optional):": "Zi\u0146a (nav oblig\u0101ti)",
    "Mobile": "Mobilais",
    "Modification Details": "Detaliz\u0113ta inform\u0101cija par izmai\u0146\u0101m",
    "Modified": "Main\u012bts",
    "Modified files": "Main\u012bt\u0101s datnes",
    "Modifier": "Main\u012bjis",
    "Month:": "M\u0113nes\u012b: ",
    "More": "Vair\u0101k",
    "More Operations": "Vair\u0101k darb\u012bbas",
    "Move": "P\u0101rvietot",
    "Move selected item(s) to:": "P\u0101rvietot atlas\u012bto ierakstu(s) uz:",
    "My Groups": "Manas grupas",
    "My Libraries": "Manas bibliot\u0113kas",
    "Name": "Nosaukums",
    "Name is required": "Nepiecie\u0161ams nosaukums",
    "Name is required.": "Nepiecie\u0161ams nosaukums.",
    "Name(optional)": "V\u0101rds (nav oblig\u0101ti)",
    "New Excel File": "Jauna Excel datne",
    "New File": "Jauna datne",
    "New Folder": "Jauna mape",
    "New Group": "Jauna grupa",
    "New Library": "Jauna kr\u0101tuve",
    "New Password": "Jauna parole",
    "New Password Again": "Jaun\u0101 parole atk\u0101rtoti",
    "New PowerPoint File": "Jauna PowerPoint datne",
    "New directories": "Jaunas mapes",
    "New files": "Jauna datne",
    "New password is too short": "Jaun\u0101 parole par \u012bsu",
    "New passwords don't match": "Jaun\u0101 parole nesakr\u012bt",
    "Next": "N\u0101kamais",
    "No comment yet.": "Nav koment\u0101ru.",
    "No connected devices": "Nav savienotas ier\u012bces",
    "No groups": "Nav grupas",
    "No libraries": "Bibliot\u0113kas nav",
    "No members": "Nav biedru",
    "No result": "Nav rezult\u0101ta",
    "No sync errors": "Nav sinhroniz\u0101cijas k\u013c\u016bdas",
    "None": "Neviens",
    "Notification Detail": "Pazi\u0146ojuma deta\u013cas",
    "Notifications": "Pazi\u0146ojums",
    "Number of groups": "Grupu skaits",
    "Off": "Izsl\u0113gt",
    "Old Password": "Vec\u0101 parole",
    "On": "Iesl\u0113gt",
    "Only keep a period of history:": "Glab\u0101t v\u0113sturi par periodu:",
    "Open via Client": "Atv\u0113rt ar klientu",
    "Operation": "Darb\u012bbas",
    "Operation succeeded.": "Darb\u012bba veiksm\u012bga",
    "Operations": "Darb\u012bbas",
    "Organization": "Organiz\u0101cija",
    "Organization Admin": "Organiz\u0101cijas administrators",
    "Organizations": "Organiz\u0101cijas",
    "Other Libraries": "Cita bibliot\u0113ka",
    "Owner": "\u012apa\u0161nieks",
    "Packaging...": "Pakoju...",
    "Password": "Parole",
    "Password again": "Atk\u0101rtot paroli",
    "Password is too short": "Parole par \u012bsu",
    "Password:": "Parole:",
    "Passwords don't match": "Paroles nesakr\u012bt",
    "Permission": "Ties\u012bbas",
    "Permission denied": "Pieeja liegta",
    "Permission:": "Ties\u012bbas:",
    "Platform": "Platforma",
    "Please check the network.": "L\u016bdzu p\u0101rbaudiet t\u012bkla piesl\u0113gumu",
    "Please enter 1 or more character": "L\u016bdzu, ievadiet 1 vai vair\u0101k rakstz\u012bmes",
    "Please enter a new password": "L\u016bdzu, ievadiet jaunu paroli",
    "Please enter days": "L\u016bdzu, ievadiet dienas",
    "Please enter password": "L\u016bdzu, ievadiet paroli.",
    "Please enter the new password again": "L\u016bdzu, ievadiet jauno paroli atk\u0101rtoti",
    "Please enter the old password": "L\u016bdzu, ievadiet veco paroli",
    "Please enter the password again": "L\u016bdzu ievad\u012bt paroli v\u0113lreiz",
    "Please input at least an email.": "L\u016bdzu, ievadiet vismaz e-pastu.",
    "Previous": "Iepriek\u0161\u0113jais",
    "Professional Edition": "Profesion\u0101lais izdevums",
    "Profile": "Profils",
    "Profile Setting": "Profila iestat\u012bjumi",
    "Read-Only": "Tikai las\u012bt",
    "Read-Only library": "Tikai las\u012bt bibliot\u0113ka",
    "Read-Write": "Las\u012bt-Rakst\u012bt",
    "Read-Write library": "Las\u012bt-Rakst\u012bt bibliot\u0113ka",
    "Really want to delete your account?": "Tie\u0161\u0101m dz\u0113st kontu?",
    "Remove": "Aizv\u0101kt",
    "Rename": "P\u0101rsaukt",
    "Rename File": "P\u0101rsaukt datni",
    "Rename Folder": "P\u0101rsaukt mapi",
    "Renamed or Moved files": "P\u0101rsaukt vai p\u0101rvietot datnes",
    "Replace": "Aizst\u0101t",
    "Replace file {filename}?": "Aizst\u0101t datni {filename}?",
    "Replacing it will overwrite its content.": "Aizst\u0101jot tiks p\u0101rrakst\u012bts datnes saturs.",
    "Reset Password": "Atiestat\u012bt paroli",
    "ResetPwd": "Atstat\u012bt",
    "Restore": "Atjaunot",
    "Restore Library": "Atjaunot bibliot\u0113ku",
    "Result": "Rezult\u0101ts",
    "Revoke Admin": "Anul\u0113t administratoru",
    "Role": "Loma",
    "Saving...": "Saglab\u0101...",
    "Seafile": "Seafile",
    "Search Files": "Mekl\u0113t datnes",
    "Search files in this library": "Mekl\u0113t datnes bibliot\u0113k\u0101",
    "Search groups": "Mekl\u0113t grupas",
    "Search users...": "Mekl\u0113t lietot\u0101jus...",
    "See All Notifications": "Skat\u012bt visus pazi\u0146ojumus",
    "Select a group": "Atlas\u012bt grupu",
    "Select libraries to share": "Atlas\u012bt koplieto\u0161anas bibliot\u0113kas ",
    "Send": "S\u016bt\u012bt",
    "Send to:": "S\u016bt\u012bt uz:",
    "Sending...": "S\u016bta...",
    "Server Version: ": "Servera versija: ",
    "Set Admin": "Iestat\u012bt administratoru",
    "Set Quota": "Iestat\u012bt kvotas",
    "Set to current": "Iestat\u012bt pa\u0161reiz\u0113jo",
    "Set {placeholder}'s permission": "Iestat\u012bt {placeholder} atlaujas",
    "Settings": "Iestat\u012bjumi",
    "Share": "Dal\u012bties",
    "Share Admin": "Koplieto\u0161an\u0101",
    "Share From": "Koplietojums no ",
    "Share Links": "Koplieto\u0161anas saites",
    "Share To": "Dal\u012bts ar",
    "Share to group": "Koplietot grupai",
    "Share to user": "Koplietot lietot\u0101jam",
    "Shared By": "Dal\u0101s",
    "Shared Links": "Koplieto\u0161anas saites",
    "Shared by: ": "Dal\u0101s: ",
    "Shared with all": "Koplietot visiem",
    "Shared with groups": "Koplietot grupai",
    "Shared with me": "Man koplietot\u0101s ",
    "Show": "R\u0101d\u012bt",
    "Show Codes": "R\u0101d\u012bt kodu",
    "Size": "Izm\u0113rs ",
    "Space Used": "Izlietots",
    "Space Used / Quota": "Izlietots / Kvota",
    "Star": "Zvaigzne",
    "Status": "Statuss",
    "Storage": "Kr\u0101tuve",
    "Storage Used": "Kr\u0101tuves izlietojums",
    "Submit": "Pielietot",
    "Success": "Veiksm\u012bgi",
    "Successfully changed library password.": "Bibliot\u0113kas parole veiksm\u012bgi nomain\u012bta.",
    "Successfully copied %(name)s and %(amount)s other items.": "Veiksm\u012bgi kop\u0113ts %(name)s un %(amount)s citi ieraksti.",
    "Successfully copied %(name)s and 1 other item.": "Veiksm\u012bgi kop\u0113ts %(name)s un 1 cits ieraksts.",
    "Successfully copied %(name)s.": "Veiksm\u012bgi kop\u0113ts %(name)s.",
    "Successfully deleted %s": "Veiksm\u012bgi dz\u0113sts %s",
    "Successfully deleted 1 item.": "Veiksm\u012bgi izdz\u0113sts 1 objekts",
    "Successfully moved %(name)s and %(amount)s other items.": "Veiksm\u012bgi p\u0101rs\u016bt\u012bts %(name)s un %(amount)s citi ieraksti.",
    "Successfully moved %(name)s and 1 other item.": "Veiksm\u012bgi p\u0101rs\u016bt\u012bts %(name)s un 1 cits ieraksts",
    "Successfully moved %(name)s.": " Veiksm\u012bgi p\u0101rs\u016bt\u012bts %(name)s.",
    "Successfully reset password to %(passwd)s for user %(user)s.": "Veiksm\u012bgi atiestat\u012bta parole %(passwd)s lietot\u0101jam %(user)s.",
    "Successfully revoke the admin permission of %s": "Veiksm\u012bgi anul\u0113t administratora at\u013caujas %s",
    "Successfully sent to {placeholder}": "Veiksm\u012bgi nos\u016bt\u012bts {placeholder}",
    "Successfully set %s as admin.": "Veiksm\u012bgi iestat\u012bts %s, k\u0101 administrators.",
    "Successfully set library history.": "Veiksm\u012bgi iestat\u012bta bibliot\u0113kas v\u0113sture.",
    "Successfully transferred the group.": "Veiksm\u012bgi p\u0101rs\u016bt\u012bta grupa",
    "Successfully transferred the library.": "Bibliot\u0113ka tika veiksm\u012bgi p\u0101rs\u016bt\u012bta.",
    "System": "Sist\u0113ma",
    "System Admin": "Administratora logs",
    "System Info": "Sist\u0113mas info",
    "Template": "\u0160ablons",
    "Terms and Conditions": "Noteikumi un nosac\u012bjumi",
    "Text": "Teksts",
    "Text files": "Teksta datne",
    "The owner of this library has run out of space.": "Bibliot\u0113kas \u012bpa\u0161niekam ir aptr\u016bkusies vieta.",
    "The password will be kept in the server for only 1 hour.": "Parole tiks glab\u0101ta uz servera tikai 1 stundu.",
    "This library is password protected": "Bibliot\u0113ka ir aizsarg\u0101ta ar paroli",
    "This operation will not be reverted. Please think twice!": "Neatgriezeniska darb\u012bba, izdom\u0101jiet k\u0101rt\u012bgi!",
    "Time": "Laiks",
    "Tip: 0 means default limit": "Padoms. 0 ir noklus\u0113tais limits",
    "Tools": "Darbar\u012bki",
    "Total Devices": "Kop\u0101 ier\u012bces",
    "Total Users": "Kopskaits",
    "Traffic": "Datpl\u016bsma",
    "Transfer": "P\u0101rs\u016bt\u012bt",
    "Transfer Library": "P\u0101rs\u016bt\u012bt bibliot\u0113ku",
    "Trash": "Miskaste",
    "Two-Factor Authentication": "Divfaktoru autentifik\u0101cija",
    "Type": "Tips",
    "Unknown": "Nezin\u0101ms",
    "Unlink": "Atsaist\u012bt",
    "Unlink device": "Atsaist\u012bt\u0101s ier\u012bces",
    "Unlock": "Atblo\u0137\u0113t",
    "Unshare": "Liegt pieeju",
    "Unshare Library": "Atcelt pieejas kr\u0101tuvei",
    "Unstar": "Bez zvaigzn\u012btes",
    "Update": "Atjaunot",
    "Update Terms and Conditions": "Atjaunot noteikumus un nosac\u012bjumus",
    "Upgrade to Pro Edition": "jaunin\u0101\u0161ana uz profesion\u0101lo izdevumu",
    "Upload": "Aug\u0161upl\u0101d\u0113t",
    "Upload Files": "Aug\u0161upl\u0101d\u0113t datnes",
    "Upload Folder": "Aug\u0161upl\u0101d\u0113t mapi",
    "Upload Link": "Aug\u0161upiel\u0101d\u0113t saiti",
    "Upload Links": "Aug\u0161upiel\u0101d\u0113t saites",
    "Upload file": "Aug\u0161upl\u0101d\u0113t datni",
    "Used:": "Lietots:",
    "User": "Lietot\u0101js",
    "User Permission": "Lietot\u0101ja ties\u012bbas",
    "Username:": "Lietot\u0101jv\u0101rds:",
    "Users": "Lietot\u0101ji",
    "Version": "Versija",
    "Version Number": "Versijas numurs",
    "Video": "Video",
    "View": "Skat\u012bt",
    "View Snapshot": "Skat\u012bt momentuz\u0146\u0113mumu",
    "View profile and more": "Skat\u012bt profilu",
    "Virus File": "V\u012brusa datne",
    "Virus Scan": "V\u012brusu sken\u0113\u0161ana",
    "Visits": "Apmekl\u0113jumi",
    "Wrong password": "K\u013c\u016bdaina parole",
    "You can also add a user as a guest, who will not be allowed to create libraries and groups.": "Varat pievienot lietot\u0101ju k\u0101 viesi, kuram netiks at\u013cauts izveidot bibliot\u0113kas vai grupas.",
    "ZIP": "ZIP",
    "all": "visi",
    "all members": "visi dal\u012bbnieki",
    "days": "dienas",
    "icon": "ikona",
    "locked": "blo\u0137\u0113ts",
    "name": "v\u0101rds",
    "shared by:": "dal\u0101s:  ",
    "starred": "zvaig\u017e\u0146otas",
    "to": "uz",
    "unstarred": "bez zvaigz\u012bnes",
    "you can also press \u2190 ": "var spiest ar\u012b  \u2190 ",
    "{placeholder} Folder Permission": "{placeholder} Mapes at\u013caujas"
  };
  for (const key in newcatalog) {
    django.catalog[key] = newcatalog[key];
  }
  

  if (!django.jsi18n_initialized) {
    django.gettext = function(msgid) {
      const value = django.catalog[msgid];
      if (typeof value === 'undefined') {
        return msgid;
      } else {
        return (typeof value === 'string') ? value : value[0];
      }
    };

    django.ngettext = function(singular, plural, count) {
      const value = django.catalog[singular];
      if (typeof value === 'undefined') {
        return (count == 1) ? singular : plural;
      } else {
        return value.constructor === Array ? value[django.pluralidx(count)] : value;
      }
    };

    django.gettext_noop = function(msgid) { return msgid; };

    django.pgettext = function(context, msgid) {
      let value = django.gettext(context + '\x04' + msgid);
      if (value.includes('\x04')) {
        value = msgid;
      }
      return value;
    };

    django.npgettext = function(context, singular, plural, count) {
      let value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
      if (value.includes('\x04')) {
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
    "DATETIME_FORMAT": "Y. \\g\\a\\d\\a j. F, H:i",
    "DATETIME_INPUT_FORMATS": [
      "%Y-%m-%d %H:%M:%S",
      "%Y-%m-%d %H:%M:%S.%f",
      "%Y-%m-%d %H:%M",
      "%d.%m.%Y %H:%M:%S",
      "%d.%m.%Y %H:%M:%S.%f",
      "%d.%m.%Y %H:%M",
      "%d.%m.%y %H:%M:%S",
      "%d.%m.%y %H:%M:%S.%f",
      "%d.%m.%y %H:%M",
      "%d.%m.%y %H.%M.%S",
      "%d.%m.%y %H.%M.%S.%f",
      "%d.%m.%y %H.%M",
      "%Y-%m-%d"
    ],
    "DATE_FORMAT": "Y. \\g\\a\\d\\a j. F",
    "DATE_INPUT_FORMATS": [
      "%Y-%m-%d",
      "%d.%m.%Y",
      "%d.%m.%y"
    ],
    "DECIMAL_SEPARATOR": ",",
    "FIRST_DAY_OF_WEEK": 1,
    "MONTH_DAY_FORMAT": "j. F",
    "NUMBER_GROUPING": 3,
    "SHORT_DATETIME_FORMAT": "j.m.Y H:i",
    "SHORT_DATE_FORMAT": "j.m.Y",
    "THOUSAND_SEPARATOR": "\u00a0",
    "TIME_FORMAT": "H:i",
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S",
      "%H:%M:%S.%f",
      "%H:%M",
      "%H.%M.%S",
      "%H.%M.%S.%f",
      "%H.%M"
    ],
    "YEAR_MONTH_FORMAT": "Y. \\g. F"
  };

    django.get_format = function(format_type) {
      const value = django.formats[format_type];
      if (typeof value === 'undefined') {
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
};


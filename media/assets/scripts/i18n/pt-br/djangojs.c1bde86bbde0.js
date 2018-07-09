

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
    "%curr% of %total%": "%curr% do %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">A imagem</a> n\u00e3o pode ser carregada.", 
    "Add User": "Adicionar Usu\u00e1rio", 
    "Added user {user}": "Usu\u00e1rio adicionado {user}", 
    "Are you sure you want to clear trash?": "Voc\u00ea tem certeza que deseja limpar a lixeira?", 
    "Are you sure you want to delete %s ?": "Voc\u00ea tem certeza que deseja excluir %s ?", 
    "Are you sure you want to delete %s completely?": "Voc\u00ea tem certeza que deseja excluir %s completamente?", 
    "Are you sure you want to delete all %s's libraries?": "Voc\u00ea tem certeza que deseja excluir todas as bibliotecas de %s?", 
    "Are you sure you want to delete these selected items?": "Tem certeza que deseja excluir os items selecionados?", 
    "Are you sure you want to quit this group?": "Voc\u00ea tem certeza que deseja sair deste grupo?", 
    "Are you sure you want to restore %s?": "Voc\u00ea tem certeza que deseja restaurar %s?", 
    "Are you sure you want to unlink this device?": "Voc\u00ea tem certeza que deseja desconectar este dispositivo?", 
    "Are you sure you want to unshare %s ?": "Voc\u00ea tem certeza que quer descompartilhar %s?", 
    "Cancel": "Cancelar", 
    "Canceled.": "Cancelados", 
    "Change Password of Library {placeholder}": "Alterar senha da Biblioteca {placeholder}", 
    "Clear Trash": "Limpar Lixeira", 
    "Close (Esc)": "Fechar(Esc)", 
    "Copy selected item(s) to:": "Copiar itens selecionados para:", 
    "Copy {placeholder} to:": "Copiar {placeholder} para:", 
    "Copying %(name)s": "Copiando %(name)s", 
    "Copying file %(index)s of %(total)s": "Copiando %(index) arquivos de %(total)s", 
    "Create Group": "Criar Grupo", 
    "Created group {group_name}": "Grupo Criado {group_name}", 
    "Delete": "Excluir", 
    "Delete Group": "Excluir Grupo", 
    "Delete Items": "Excluir items", 
    "Delete Library": "Excluir Biblioteca", 
    "Delete Library By Owner": "Excluir Biblioteca Por Propriet\u00e1rio", 
    "Delete Member": "Excluir Membro", 
    "Delete User": "Excluir Usu\u00e1rio", 
    "Delete failed": "Exclus\u00e3o falhou", 
    "Delete files from this device the next time it comes online.": "Excluir arquivos deste dispositivo da pr\u00f3xima vez em que ele estiver online.", 
    "Deleted directories": "Diret\u00f3rios exclu\u00eddos", 
    "Deleted files": "Arquivos exclu\u00eddo", 
    "Deleted group {group_name}": "Grupo exclu\u00eddo {group_name}", 
    "Deleted library {library_name}": "Biblioteca exclu\u00edda {library_name}", 
    "Deleted user {user}": "Usu\u00e1rio exclu\u00eddo {user}", 
    "Dismiss Group": "Ignorar Grupo", 
    "Edit failed": "Edi\u00e7\u00e3o falhou", 
    "Empty file upload result": "Resultado do carregamento de arquivos vazio", 
    "Encrypted library": "Biblioteca encriptada", 
    "Error": "Erro", 
    "Expired": "Expirado", 
    "Failed to copy %(name)s": "Falha ao copiar %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Falha ao excluir %(name)s e %(amount)s outros items.", 
    "Failed to delete %(name)s and 1 other item.": "Falha ao excluir %(name)s e 1 outro items", 
    "Failed to delete %(name)s.": "Falha ao excluir %(name)s.", 
    "Failed to move %(name)s": "Falha ao mover %(name)s", 
    "Failed to send to {placeholder}": "Falha ao enviar para  {placeholder}", 
    "Failed.": "Falhou", 
    "Failed. Please check the network.": "Falha. Por favor, verifique a rede.", 
    "File Upload canceled": "Carregamento de Arquivo cancelado", 
    "File Upload complete": "Carregamento de Arquivo completo", 
    "File Upload failed": "Carregamento de Arquivo falhou", 
    "File Uploading...": "Carregando Arquivo...", 
    "File is locked": "Arquivo est\u00e1 bloqueado", 
    "File is too big": "Arquivo muito grande", 
    "File is too small": "Arquivo muito pequeno", 
    "Filetype not allowed": "Tipo de arquivo n\u00e3o permitido", 
    "Hide": "Esconder", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Erro intero. Falha ao copiar %(name)s e %(amount)s outros item(s).", 
    "Internal error. Failed to copy %(name)s.": "Erro interno. Falha ao copiar  %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Erro interno. Falha ao mover %(name)s e %(amount)s outros item(s).", 
    "Internal error. Failed to move %(name)s.": "Erro interno. Falha ao mover %(name)s.", 
    "Invalid destination path": "Caminho de destino inv\u00e1lido", 
    "It is required.": "Obrigatorio", 
    "Just now": "Agora mesmo", 
    "Loading failed": "Falha no carregamento", 
    "Loading...": "Carregando...", 
    "Log in": "Entrar", 
    "Modified files": "Arquivos modificados", 
    "Move selected item(s) to:": "Mover itens selecionados para:", 
    "Move {placeholder} to:": "Mover {placeholder} para:", 
    "Moving %(name)s": "Movendo %(name)s", 
    "Moving file %(index)s of %(total)s": "Movendo %(index) arquivos de %(total)s", 
    "Name is required": "Nome requerido", 
    "Name is required.": "\u00c9 necess\u00e1rio fornecer nome.", 
    "Name should not include '/'.": "O Nome n\u00e3o pode incluir \"/\".", 
    "New Excel File": "Novo Arquivo Excel", 
    "New File": "Novo Arquivo", 
    "New Markdown File": "Novo Arquivo Markdown", 
    "New PowerPoint File": "Novo Arquivo PowerPoint", 
    "New Word File": "Novo Arquivo Word", 
    "New directories": "Novos diret\u00f3rios", 
    "New files": "Novos arquivos", 
    "New password is too short": "A nova senha \u00e9 muito curta", 
    "New passwords don't match": "A nova senha e sua confirma\u00e7\u00e3o n\u00e3o s\u00e3o iguais", 
    "Next (Right arrow key)": "Proximo (Seta para a direita)", 
    "No matches": "Nenhum ocorr\u00eancia", 
    "Only an extension there, please input a name.": "H\u00e1 apenas uma extens\u00e3o aqui, por favor, insira um nome.", 
    "Open in New Tab": "Abrir Nova Aba", 
    "Packaging...": "Empacotando...", 
    "Password is required.": "Senha obrigatoria", 
    "Password is too short": "Senha muito curta", 
    "Passwords don't match": "Senhas n\u00e3o coincidem", 
    "Permission error": "Erro de Permiss\u00e3o", 
    "Please check the network.": "Por favor ", 
    "Please choose a CSV file": "Por favor selecione um arquivo no formato CSV", 
    "Please click and choose a directory.": "Por favor clique e selecione um diret\u00f3rio.", 
    "Please enter 1 or more character": "Por favor  digite 1 ou mais caracteres", 
    "Please enter a new password": "Entre com a nova senha", 
    "Please enter days.": "Por favor insira os dias", 
    "Please enter password": "Por favor insira a senha", 
    "Please enter the new password again": "Por favor entre com a nova senha novamente", 
    "Please enter the old password": "Entre com a senha atual", 
    "Please enter the password again": "Por favor insira a senha novamente", 
    "Please enter valid days": "Por favor insira dias validos", 
    "Please input at least an email.": "Por favor, insira pelo menos um e-mail.", 
    "Previous (Left arrow key)": "Voltar (Seta para a esquerda)", 
    "Processing...": "Processando...", 
    "Quit Group": "Sair do Grupo", 
    "Read-Only": "Somente Leitura", 
    "Read-Only library": "Biblioteca no modo somente leitura", 
    "Read-Write": "Leitura-Escrita", 
    "Read-Write library": "Biblioteca no modo leitura-escrita", 
    "Really want to dismiss this group?": "Voc\u00ea realmente deseja ignorar este grupo?", 
    "Refresh": "Atualizar", 
    "Rename File": "Renonear Arquivo", 
    "Rename Folder": "Renomear Pasta", 
    "Renamed or Moved files": "Arquivos renomeados ou movidos", 
    "Replace file {filename}?": "Substituir arquivo {filename}?", 
    "Restore Library": "Restaurar Biblioteca", 
    "Saving...": "Salvando...", 
    "Search groups": "Procurar grupos", 
    "Search user or enter email and press Enter": "Procure o usu\u00e1rio pelo nome ou e-mail e pressione Enter", 
    "Search users or enter emails and press Enter": "Digite o nome do usu\u00e1rio ou o e-mail e tecle Enter", 
    "Searching...": "Procurando...", 
    "Select a group": "Selecionar um grupo", 
    "Select groups": "Selecionar grupos", 
    "Set {placeholder}'s permission": "Setar {placeholder}'s  permiss\u00e3o", 
    "Share {placeholder}": "Compartilhar {placeholder}", 
    "Show": "Mostrar", 
    "Start": "Iniciar", 
    "Success": "Sucesso", 
    "Successfully changed library password.": "Senha da biblioteca alterada com sucesso.", 
    "Successfully clean all errors.": "Todos os erros foram eliminados com sucesso.", 
    "Successfully copied %(name)s": "%(name)s copiado com sucesso", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s and %(amount)s outros items.copiados com sucesso", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s  copiado com sucesso e  1 outro items", 
    "Successfully copied %(name)s.": " %(name)s. copiados com sucesso", 
    "Successfully deleted %(name)s": "%(name)s exclu\u00eddo com sucesso", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Exclu\u00eddo com \u00eaxito% (name)s e %(amount) s outros itens.", 
    "Successfully deleted %(name)s and 1 other item.": "Sucesso ao excluir %(name)s e 1 outro item.", 
    "Successfully deleted %(name)s.": "%(name)s exclu\u00eddos com sucesso.", 
    "Successfully deleted 1 item": "Sucesso ao excluir 1 item. ", 
    "Successfully deleted 1 item.": "Item exclu\u00eddo com sucesso.", 
    "Successfully deleted member {placeholder}": "Sucesso ao exclu\u00eddo membro {placeholder}", 
    "Successfully deleted.": "Exclu\u00eddo com sucesso.", 
    "Successfully imported.": "Importado com sucesso.", 
    "Successfully modified permission": "Permiss\u00f5es modificadas com sucesso", 
    "Successfully moved %(name)s": "%(name)s movido com sucesso", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s e %(amount)s outros items.copiados com sucesso", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s e  1 outro item.copiados com sucesso", 
    "Successfully moved %(name)s.": "Movidos com sucesso %(name)s.", 
    "Successfully sent to {placeholder}": "Enviado com sucesso para {placeholder}", 
    "Successfully set library history.": "Hist\u00f3rico da biblioteca atualizado com sucesso.", 
    "Successfully transferred the group.": "Grupo transferido com sucesso.", 
    "Successfully transferred the group. You are now a normal member of the group.": "O grupo foi transferido com sucesso. Voc\u00ea agora \u00e9 um membro regular do grupo.", 
    "Successfully transferred the library.": "Biblioteca transferida com sucesso.", 
    "Successfully unlink %(name)s.": "O dispositivo %(name)s foi desconectado com sucesso.", 
    "Successfully unshared 1 item.": "O compartilhamento foi removido com sucesso.", 
    "Successfully unshared library {placeholder}": "Sucesso ao descompartilhar biblioteca {placeholder}", 
    "Successfully unstared {placeholder}": "{placeholder} desmarcado com sucesso", 
    "Transfer Group": "Transferir Grupo", 
    "Transfer Group {group_name} To": "Transferir Grupo {group_name} para", 
    "Transfer Library": "Tranferir Biblioteca", 
    "Transfer Library {library_name} To": "Transferir Biblioteca {library_name} para", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Grupo transferido {group_name} de {user_from} para {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "Biblioteca transferida {library_name} de {user_from} para {user_to}", 
    "Unlink device": "Desconectar dispositivo", 
    "Unshare Library": "Descompartilhar Biblioteca", 
    "Uploaded bytes exceed file size": "Bytes enviados excedem o tamanho do arquivo", 
    "You can only select 1 item": "Voc\u00ea pode selecionar apenas 1 item", 
    "You cannot select any more choices": "Voc\u00ea n\u00e3o pode selecionar mais op\u00e7\u00f5es", 
    "You have logged out.": "Voc\u00ea encerrou a sess\u00e3o.", 
    "canceled": "Cancelado", 
    "locked by {placeholder}": "Bloqueado por {placeholder}", 
    "uploaded": "Carregado", 
    "{placeholder} Folder Permission": "{placeholder} Permiss\u00e3o da Pasta", 
    "{placeholder} History Setting": "{placeholder} Configura\u00e7\u00e3o do Hist\u00f3rico", 
    "{placeholder} Members": "{placeholder} Membros", 
    "{placeholder} Share Links": "{placeholder}  Compartilhar Links"
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
    "DATETIME_FORMAT": "j \\d\\e F \\d\\e Y \u00e0\\s H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%Y", 
      "%d/%m/%y %H:%M:%S", 
      "%d/%m/%y %H:%M:%S.%f", 
      "%d/%m/%y %H:%M", 
      "%d/%m/%y", 
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
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "j \\d\\e F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d/m/Y H:i", 
    "SHORT_DATE_FORMAT": "d/m/Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "H:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F \\d\\e Y"
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


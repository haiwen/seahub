

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
    "A file with the same name already exists in this folder.": "Um arquivo com o mesmo nome j\u00e1 existe nesta pasta", 
    "About": "Sobre", 
    "About Us": "Sobre", 
    "Access Log": "Registro de acesso", 
    "Actions": "A\u00e7\u00f5es", 
    "Active": "Ativo", 
    "Active Users": "Usu\u00e1rios ativos", 
    "Activities": "Atividades", 
    "Add Admins": "Incluir Administradores", 
    "Add Library": "Adicionar  biblioteca", 
    "Add Member": "Adicionar Membro", 
    "Add User": "Adicionar Usu\u00e1rio", 
    "Add Wiki": "Adicionar Wiki", 
    "Add admin": "Incluir administrador", 
    "Add auto expiration": "Adicionar auto expira\u00e7\u00e3o", 
    "Add password protection": "Adicionar prote\u00e7\u00e3o por senha", 
    "Add user": "Incluir usu\u00e1rios", 
    "Added user {user}": "Usu\u00e1rio adicionado {user}", 
    "Admin": "Administrador", 
    "Admin Logs": "Logs do Administrador", 
    "All": "Todos", 
    "All Groups": "Todos os grupos", 
    "All Public Links": "Todos links p\u00fablicos", 
    "Anonymous User": "Usu\u00e1rio an\u00f4nimo", 
    "Are you sure you want to clear trash?": "Voc\u00ea tem certeza que deseja limpar a lixeira?", 
    "Are you sure you want to delete %s ?": "Voc\u00ea tem certeza que deseja excluir %s ?", 
    "Are you sure you want to delete %s completely?": "Voc\u00ea tem certeza que deseja excluir %s completamente?", 
    "Are you sure you want to delete all %s's libraries?": "Voc\u00ea tem certeza que deseja excluir todas as bibliotecas de %s?", 
    "Are you sure you want to delete these selected items?": "Tem certeza que deseja excluir os items selecionados?", 
    "Are you sure you want to quit this group?": "Voc\u00ea tem certeza que deseja sair deste grupo?", 
    "Are you sure you want to restore %s?": "Voc\u00ea tem certeza que deseja restaurar %s?", 
    "Are you sure you want to unlink this device?": "Voc\u00ea tem certeza que deseja desconectar este dispositivo?", 
    "Are you sure you want to unshare %s ?": "Voc\u00ea tem certeza que quer descompartilhar %s?", 
    "Avatar": "Avatar", 
    "Back": "Voltar", 
    "Broken (please contact your administrator to fix this library)": "Danificado (por favor contate seu administrador para consertar esta biblioteca)", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "N\u00e3o \u00e9 poss\u00edvel copiar o diret\u00f3rio %(src)s para o subdiret\u00f3rio %(des)s", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "N\u00e3o \u00e9 poss\u00edvel mover o diret\u00f3rio %(src)s para o subdiret\u00f3rio %(des)s", 
    "Cancel": "Cancelar", 
    "Cancel All": "Cancelar Todos", 
    "Canceled.": "Cancelados", 
    "Change Password": "Trocar senha", 
    "Change Password of Library {placeholder}": "Alterar senha da Biblioteca {placeholder}", 
    "Clear Trash": "Limpar Lixeira", 
    "Clients": "Clientes", 
    "Close": "Fechar", 
    "Close (Esc)": "Fechar(Esc)", 
    "Comment": "Coment\u00e1rio", 
    "Comments": "Coment\u00e1rios", 
    "Confirm Password": "Confirme a senha", 
    "Copy": "Copiar", 
    "Copy selected item(s) to:": "Copiar itens selecionados para:", 
    "Copy {placeholder} to:": "Copiar {placeholder} para:", 
    "Copying %(name)s": "Copiando %(name)s", 
    "Copying file %(index)s of %(total)s": "Copiando %(index) arquivos de %(total)s", 
    "Count": "Contar", 
    "Create At / Last Login": "Criado em / \u00daltimo Login", 
    "Create Group": "Criar Grupo", 
    "Created At": "Criado em", 
    "Created group {group_name}": "Grupo Criado {group_name}", 
    "Created library": "Biblioteca criada", 
    "Creator": "Criador", 
    "Current Library": "Biblioteca atual", 
    "Date": "Data", 
    "Delete": "Excluir", 
    "Delete Group": "Excluir Grupo", 
    "Delete Items": "Excluir items", 
    "Delete Library": "Excluir Biblioteca", 
    "Delete Library By Owner": "Excluir Biblioteca Por Propriet\u00e1rio", 
    "Delete Member": "Excluir Membro", 
    "Delete User": "Excluir Usu\u00e1rio", 
    "Delete failed": "Exclus\u00e3o falhou", 
    "Delete files from this device the next time it comes online.": "Excluir arquivos deste dispositivo da pr\u00f3xima vez em que ele estiver online.", 
    "Deleted Time": "Excluir hora", 
    "Deleted directories": "Diret\u00f3rios exclu\u00eddos", 
    "Deleted files": "Arquivos exclu\u00eddo", 
    "Deleted group {group_name}": "Grupo exclu\u00eddo {group_name}", 
    "Deleted library": "Biblioteca exclu\u00edda", 
    "Deleted library {library_name}": "Biblioteca exclu\u00edda {library_name}", 
    "Deleted user {user}": "Usu\u00e1rio exclu\u00eddo {user}", 
    "Details": "Detalhes", 
    "Device Name": "Nome do Dispositivo", 
    "Devices": "Dispositivos", 
    "Dismiss": "Descartar", 
    "Dismiss Group": "Ignorar Grupo", 
    "Document convertion failed.": "A convers\u00e3o falhou", 
    "Don't keep history": "N\u00e3o manter hist\u00f3rico", 
    "Don't replace": "N\u00e3o Substituir", 
    "Download": "Download", 
    "Edit": "Editar", 
    "Edit Page": "Editar p\u00e1gina", 
    "Edit failed": "Edi\u00e7\u00e3o falhou", 
    "Edit failed.": "Edi\u00e7\u00e3o falhou.", 
    "Email": "E-mail", 
    "Empty file upload result": "Resultado do carregamento de arquivos vazio", 
    "Encrypt": "Criptografar", 
    "Encrypted library": "Biblioteca encriptada", 
    "Error": "Erro", 
    "Expiration": "Expira\u00e7\u00e3o", 
    "Expired": "Expirado", 
    "Failed to copy %(name)s": "Falha ao copiar %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Falha ao excluir %(name)s e %(amount)s outros items.", 
    "Failed to delete %(name)s and 1 other item.": "Falha ao excluir %(name)s e 1 outro items", 
    "Failed to delete %(name)s.": "Falha ao excluir %(name)s.", 
    "Failed to move %(name)s": "Falha ao mover %(name)s", 
    "Failed to send to {placeholder}": "Falha ao enviar para  {placeholder}", 
    "Failed.": "Falhou", 
    "Failed. Please check the network.": "Falha. Por favor, verifique a rede.", 
    "Favorites": "Favoritos", 
    "File": "Arquivo", 
    "File Name": "Nome do arquivo", 
    "File Upload": "Carregamento de Arquivo", 
    "File Upload canceled": "Carregamento de Arquivo cancelado", 
    "File Upload complete": "Carregamento de Arquivo completo", 
    "File Upload failed": "Carregamento de Arquivo falhou", 
    "File Uploading...": "Carregando Arquivo...", 
    "File download is disabled: the share link traffic of owner is used up.": "O download do arquivo foi desativado: o  tr\u00e1fego do  link compartilhado se esgotou.", 
    "File is locked": "Arquivo est\u00e1 bloqueado", 
    "File is too big": "Arquivo muito grande", 
    "File is too small": "Arquivo muito pequeno", 
    "Files": "Arquivos", 
    "Filetype not allowed": "Tipo de arquivo n\u00e3o permitido", 
    "Folder": "Pasta", 
    "Folder Permission": "Permiss\u00e3o da Pasta", 
    "Folders": "Pastas", 
    "Generate": "Gerar", 
    "Group": "Grupo", 
    "Groups": "Grupos", 
    "Help": "Ajuda", 
    "Hide": "Esconder", 
    "History": "Hist\u00f3rico", 
    "History Setting": "Configura\u00e7\u00f5es do Hist\u00f3rico", 
    "IP": "IP", 
    "Inactive": "Inativo", 
    "Info": "Informa\u00e7\u00e3o", 
    "Institutions": "Institui\u00e7\u00f5es", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Erro intero. Falha ao copiar %(name)s e %(amount)s outros item(s).", 
    "Internal error. Failed to copy %(name)s.": "Erro interno. Falha ao copiar  %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Erro interno. Falha ao mover %(name)s e %(amount)s outros item(s).", 
    "Internal error. Failed to move %(name)s.": "Erro interno. Falha ao mover %(name)s.", 
    "Invalid destination path": "Caminho de destino inv\u00e1lido", 
    "Invitations": "Convites", 
    "It is required.": "Obrigatorio", 
    "Just now": "Agora mesmo", 
    "Keep full history": "Manter hist\u00f3rico completo", 
    "Last Access": "\u00daltimo Acesso", 
    "Last Update": "\u00daltima atualiza\u00e7\u00e3o", 
    "Leave Share": "Permitir compartilhamento", 
    "Libraries": "Bibliotecas", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "Bibliotecas compartilhadas no modo de escrita podem ser baixadas e sincronizadas por outros membros do grupo. Bibliotecas no modo de leitura pode ser apenas baixada, as altera\u00e7\u00f5es de outros n\u00e3o ser\u00e3o atualizadas.", 
    "Library": "Biblioteca", 
    "Library Type": "Tipo da Biblioteca", 
    "Limits": "Limites", 
    "Link": "Link", 
    "Linked Devices": "Dispositivos Conectados", 
    "Links": "Links", 
    "List": "Lista", 
    "Loading failed": "Falha no carregamento", 
    "Loading...": "Carregando...", 
    "Lock": "Trava", 
    "Log in": "Entrar", 
    "Log out": "Sair", 
    "Logs": "Logs", 
    "Manage Members": "Gerenciar Membros", 
    "Member": "Membro", 
    "Members": "Membros", 
    "Modification Details": "Detalhes de modifica\u00e7\u00e3o", 
    "Modified files": "Arquivos modificados", 
    "More": "Mais", 
    "More Operations": "Mais opera\u00e7\u00f5es", 
    "Move": "Mover", 
    "Move selected item(s) to:": "Mover itens selecionados para:", 
    "Move {placeholder} to:": "Mover {placeholder} para:", 
    "Moving %(name)s": "Movendo %(name)s", 
    "Moving file %(index)s of %(total)s": "Movendo %(index) arquivos de %(total)s", 
    "My Groups": "Meus grupos", 
    "My Libraries": "Minhas Bibliotecas", 
    "Name": "Nome", 
    "Name is required": "Nome requerido", 
    "Name is required.": "\u00c9 necess\u00e1rio fornecer nome.", 
    "Name should not include '/'.": "O Nome n\u00e3o pode incluir \"/\".", 
    "Name(optional)": "Nome(opcional)", 
    "New": "Novo", 
    "New Excel File": "Novo Arquivo Excel", 
    "New File": "Novo Arquivo", 
    "New Folder": "Nova Pasta", 
    "New Group": "Novo Grupo", 
    "New Library": "Nova biblioteca", 
    "New Markdown File": "Novo Arquivo Markdown", 
    "New Password": "Nova Senha", 
    "New Password Again": "Nova senha de novo", 
    "New PowerPoint File": "Novo Arquivo PowerPoint", 
    "New Word File": "Novo Arquivo Word", 
    "New directories": "Novos diret\u00f3rios", 
    "New files": "Novos arquivos", 
    "New password is too short": "A nova senha \u00e9 muito curta", 
    "New passwords don't match": "A nova senha e sua confirma\u00e7\u00e3o n\u00e3o s\u00e3o iguais", 
    "Next": "Pr\u00f3ximo", 
    "Next (Right arrow key)": "Proximo (Seta para a direita)", 
    "No comment yet.": "Nenhum coment\u00e1rio ainda.", 
    "No libraries": "Nenhuma biblioteca", 
    "No library is shared to this group": "Nenhuma biblioteca est\u00e1 compartilhada com esse grupo", 
    "No matches": "Nenhum ocorr\u00eancia", 
    "No members": "Nenhum membro", 
    "Notifications": "Notifica\u00e7\u00f5es", 
    "Old Password": "Antiga senha", 
    "Only an extension there, please input a name.": "H\u00e1 apenas uma extens\u00e3o aqui, por favor, insira um nome.", 
    "Only keep a period of history:": "Mantenha apenas o per\u00edodo do hist\u00f3rico:", 
    "Open in New Tab": "Abrir Nova Aba", 
    "Open via Client": "Abrir atrav\u00e9s do cliente Desktop", 
    "Operations": "Opera\u00e7\u00f5es", 
    "Organization": "Organiza\u00e7\u00e3o", 
    "Organization Admin": "Administra\u00e7\u00e3o da Organiza\u00e7\u00e3o", 
    "Organizations": "Organiza\u00e7\u00f5es", 
    "Other Libraries": "Outras bibliotecas", 
    "Owner": "Propriet\u00e1rio", 
    "Packaging...": "Empacotando...", 
    "Pages": "P\u00e1ginas", 
    "Password": "Senha", 
    "Password again": "Informe a senha novamente", 
    "Password is required.": "Senha obrigatoria", 
    "Password is too short": "Senha muito curta", 
    "Passwords don't match": "Senhas n\u00e3o coincidem", 
    "Permission": "Permiss\u00e3o", 
    "Permission denied": "Permiss\u00e3o negada", 
    "Permission error": "Erro de Permiss\u00e3o", 
    "Platform": "Plataforma", 
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
    "Previous": "Anterior", 
    "Previous (Left arrow key)": "Voltar (Seta para a esquerda)", 
    "Processing...": "Processando...", 
    "Quit Group": "Sair do Grupo", 
    "Read-Only": "Somente Leitura", 
    "Read-Only library": "Biblioteca no modo somente leitura", 
    "Read-Write": "Leitura-Escrita", 
    "Read-Write library": "Biblioteca no modo leitura-escrita", 
    "Really want to dismiss this group?": "Voc\u00ea realmente deseja ignorar este grupo?", 
    "Refresh": "Atualizar", 
    "Remove": "Remover", 
    "Rename": "Renomear", 
    "Rename File": "Renonear Arquivo", 
    "Rename Folder": "Renomear Pasta", 
    "Renamed or Moved files": "Arquivos renomeados ou movidos", 
    "Replace": "Substituir", 
    "Replace file {filename}?": "Substituir arquivo {filename}?", 
    "Replacing it will overwrite its content.": "Substitu\u00ed-lo ir\u00e1 sobreescrever seu conte\u00fado.", 
    "Reset Password": "Resetar senha", 
    "ResetPwd": "Restaurar senha", 
    "Restore": "Restaurar", 
    "Restore Library": "Restaurar Biblioteca", 
    "Revoke Admin": "Administrador revogado", 
    "Role": "Papel", 
    "Saving...": "Salvando...", 
    "Seafile": "Seafile", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "A wiki Seafile habilita voc\u00ea a organizar seu conhecimento de forma f\u00e1cil. O conte\u00fado da wiki \u00e9 guardado em um biblioteca normal com uma estrutura de arquivo/pasta pr\u00e9-definida. Isso lhe permitir\u00e1 editar sua wiki no seu desktop para ent\u00e3o sincronizar com o servidor.", 
    "Search Files": "Pesquisar arquivos", 
    "Search files in this library": "Pesquisar arquivos nessa biblioteca", 
    "Search groups": "Procurar grupos", 
    "Search user or enter email and press Enter": "Procure o usu\u00e1rio pelo nome ou e-mail e pressione Enter", 
    "Search users or enter emails and press Enter": "Digite o nome do usu\u00e1rio ou o e-mail e tecle Enter", 
    "Searching...": "Procurando...", 
    "See All Notifications": "Ver todas as Notifica\u00e7\u00f5e", 
    "Select a group": "Selecionar um grupo", 
    "Select groups": "Selecionar grupos", 
    "Select libraries to share": "Selecione bibliotecas para compartilhar", 
    "Server Version: ": "Vers\u00e3o do Servidor:", 
    "Set Quota": "definir cota", 
    "Set {placeholder}'s permission": "Setar {placeholder}'s  permiss\u00e3o", 
    "Settings": "Configura\u00e7\u00e3o", 
    "Share": "Compartilhar", 
    "Share Admin": "Compartilhar Administrador", 
    "Share From": "Compartilhamento de", 
    "Share Link": "Link compartilhado", 
    "Share Links": "Links compartilhados", 
    "Share To": "Compartilhar com", 
    "Share existing libraries": "Compartilhar bibliotecas existentes", 
    "Share to group": "Compartilhar com grupo", 
    "Share to user": "Compartilhar com usuario", 
    "Share {placeholder}": "Compartilhar {placeholder}", 
    "Shared with all": "Compartilhado com todos", 
    "Shared with groups": "Compartilhado com grupos", 
    "Shared with me": "Compartilhado comigo", 
    "Show": "Mostrar", 
    "Side Nav Menu": "Menu de Navega\u00e7\u00e3o Lateral", 
    "Size": "Tamanho", 
    "Sort:": "Ordenar:", 
    "Space Used": "Espa\u00e7o utilizado", 
    "Start": "Iniciar", 
    "Status": "Estado", 
    "Submit": "Enviar", 
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
    "Successfully deleted %s": "%s exclu\u00eddo com sucesso", 
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
    "Successfully reset password to %(passwd)s for user %(user)s.": "Reiniciada com sucesso a senha para %(passwd)s para o usu\u00e1rio %(user)s.", 
    "Successfully revoke the admin permission of %s": "A permiss\u00e3o de administrador do usu\u00e1rio %s foi revogada com sucesso", 
    "Successfully sent to {placeholder}": "Enviado com sucesso para {placeholder}", 
    "Successfully set %s as admin.": "%s foi definido como administrador com sucesso", 
    "Successfully set library history.": "Hist\u00f3rico da biblioteca atualizado com sucesso.", 
    "Successfully transferred the group.": "Grupo transferido com sucesso.", 
    "Successfully transferred the group. You are now a normal member of the group.": "O grupo foi transferido com sucesso. Voc\u00ea agora \u00e9 um membro regular do grupo.", 
    "Successfully transferred the library.": "Biblioteca transferida com sucesso.", 
    "Successfully unlink %(name)s.": "O dispositivo %(name)s foi desconectado com sucesso.", 
    "Successfully unshared 1 item.": "O compartilhamento foi removido com sucesso.", 
    "Successfully unshared library {placeholder}": "Sucesso ao descompartilhar biblioteca {placeholder}", 
    "Successfully unstared {placeholder}": "{placeholder} desmarcado com sucesso", 
    "System Admin": "Administrador do sistema", 
    "Terms and Conditions": "Termos e Condi\u00e7\u00f5es", 
    "The password will be kept in the server for only 1 hour.": "A senha ser\u00e1 mantida no servidor por apenas 1 hora.", 
    "This library is password protected": "Esta biblioteca esta protegida com senha", 
    "Time": "Hora", 
    "Tip: libraries deleted 30 days ago will be cleaned automatically.": "Dica: bibliotecas exclu\u00edda h\u00e1 mais de 30 dias ser\u00e3o automaticamente removidas.", 
    "Tools": "Ferramentas", 
    "Total Users": "Total de usu\u00e1rios", 
    "Transfer": "Transferir", 
    "Transfer Group": "Transferir Grupo", 
    "Transfer Group {group_name} To": "Transferir Grupo {group_name} para", 
    "Transfer Library": "Tranferir Biblioteca", 
    "Transfer Library {library_name} To": "Transferir Biblioteca {library_name} para", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Grupo transferido {group_name} de {user_from} para {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "Biblioteca transferida {library_name} de {user_from} para {user_to}", 
    "Trash": "Lixeira", 
    "Type": "Tipo", 
    "Unlink": "Desvincular", 
    "Unlink device": "Desconectar dispositivo", 
    "Unlock": "Destravar", 
    "Unshare": "Descompartilhar", 
    "Unshare Library": "Descompartilhar Biblioteca", 
    "Unstar": "Desmarcar", 
    "Update": "Atualizar", 
    "Upload": "Enviar arquivo", 
    "Upload Files": "Enviar arquivos", 
    "Upload Folder": "Pasta de Upload", 
    "Upload Link": "Enviar Link", 
    "Upload Links": "Enviar Links", 
    "Uploaded bytes exceed file size": "Bytes enviados excedem o tamanho do arquivo", 
    "Used:": "Utilizado:", 
    "User": "Usu\u00e1rio", 
    "Users": "Usu\u00e1rios", 
    "View": "Ver", 
    "Virus Scan": "Verifica\u00e7\u00e3o de V\u00edrus", 
    "Visits": "Visitas", 
    "Wrong password": "Senha incorreta", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "Voc\u00ea pode criar uma biblioteca para organizar seus arqquivos. Por exemplo, voc\u00ea pode criar uma para cada projeto. Cada biblioteca pode ser soncronizada e compartilhada separadamente. ", 
    "You can only select 1 item": "Voc\u00ea pode selecionar apenas 1 item", 
    "You can share a single folder with a registered user if you don't want to share a whole library.": "Voc\u00ea pode compartilhar uma pasta \u00fanica com usu\u00e1rio se voc\u00ea n\u00e3o quiser compartilhar uma biblioteca inteira.", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "Voc\u00ea pode compartilhar bibliotecas clicando no bot\u00e3o \"Nova biblioteca\" ou no \u00edcone \"Compartilhar\" na sua lista de bibliotecas.", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "Voc\u00ea pode compartilhar o link gerado para os outros e, em seguida, eles podem fazer upload de arquivos para este diret\u00f3rio atrav\u00e9s do link.", 
    "You cannot select any more choices": "Voc\u00ea n\u00e3o pode selecionar mais op\u00e7\u00f5es", 
    "You have logged out.": "Voc\u00ea encerrou a sess\u00e3o.", 
    "You have not created any libraries": "Voc\u00ea n\u00e3o criou bibliotecas", 
    "all members": "Todos os membros", 
    "canceled": "Cancelado", 
    "days": "dias", 
    "icon": "\u00edcone", 
    "last update": "\u00daltima atualiza\u00e7\u00e3o", 
    "locked": "Travado", 
    "locked by {placeholder}": "Bloqueado por {placeholder}", 
    "name": "nome", 
    "starred": "marcado", 
    "unstarred": "desmarcar", 
    "uploaded": "Carregado", 
    "you can also press \u2190 ": "voc\u00ea pode tamb\u00e9m pressionar \u2190 ", 
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


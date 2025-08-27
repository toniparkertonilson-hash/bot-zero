// ⚠️ Qualquer uso indevido ou ilegal é de total responsabilidade do usuário. Aproveite para turbinar seu bot com segurança e praticidade! 🚀\\

const chalk = require("chalk");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("./settings/config.json");
const GroupManager = require("./database/groupManager");

// ===========================
// 🌍 CONFIGURAÇÃO GLOBAL
// ===========================
const globalConfig = {
  antilinkHard: false,
  welcomeEnabled: true
};

const botStart = Date.now(); 
const groupState = new Map();
const comandos2 = ["ping", "status", "antilinkhard", "antilinkgp", "ban", "welcome", "menu", "stats", "backup"]; // lista oficial de comandos

// Inicializar gerenciador de grupos
const groupManager = new GroupManager();

// ===========================
// 📊 SISTEMA DE MONITORAMENTO
// ===========================
const monitoringData = {
  messagesReceived: 0,
  commandsExecuted: 0,
  groupsActive: new Set(),
  lastActivity: Date.now(),
  startTime: Date.now()
};

function logActivity(type, details = {}) {
  const timestamp = new Date().toLocaleString('pt-BR');
  const logEntry = {
    timestamp,
    type,
    details,
    uptime: Date.now() - botStart
  };
  
  // Log colorido no terminal
  switch (type) {
    case 'MESSAGE_RECEIVED':
      console.log(chalk.hex('#87CEEB').bold(`📨 [${timestamp}] Mensagem recebida`));
      if (details.isGroup) {
        console.log(chalk.hex('#87CEEB')(`   └─ Grupo: ${details.groupName || 'Desconhecido'}`));
      }
      console.log(chalk.hex('#87CEEB')(`   └─ Tipo: ${details.messageType || 'Texto'}`));
      break;
      
    case 'COMMAND_EXECUTED':
      console.log(chalk.hex('#98FB98').bold(`⚡ [${timestamp}] Comando executado: ${details.command}`));
      if (details.isGroup) {
        console.log(chalk.hex('#98FB98')(`   └─ Grupo: ${details.groupName || 'Desconhecido'}`));
      }
      break;
      
    case 'GROUP_DATA_SAVED':
      console.log(chalk.hex('#DDA0DD').bold(`💾 [${timestamp}] Dados do grupo salvos`));
      console.log(chalk.hex('#DDA0DD')(`   └─ Grupo: ${details.groupName}`));
      console.log(chalk.hex('#DDA0DD')(`   └─ Membros: ${details.memberCount}`));
      break;
      
    case 'ANTILINK_TRIGGERED':
      console.log(chalk.hex('#FF4500').bold(`🚫 [${timestamp}] Anti-link ativado`));
      console.log(chalk.hex('#FF4500')(`   └─ Grupo: ${details.groupName || 'Desconhecido'}`));
      console.log(chalk.hex('#FF4500')(`   └─ Ação: ${details.action}`));
      break;
      
    case 'USER_JOINED':
      console.log(chalk.hex('#FF69B4').bold(`👋 [${timestamp}] Novo membro`));
      console.log(chalk.hex('#FF69B4')(`   └─ Grupo: ${details.groupName}`));
      break;
      
    case 'CONFIG_CHANGED':
      console.log(chalk.hex('#40E0D0').bold(`⚙️  [${timestamp}] Configuração alterada`));
      console.log(chalk.hex('#40E0D0')(`   └─ ${details.setting}: ${details.value ? 'ON' : 'OFF'}`));
      break;
      
    case 'BACKUP_CREATED':
      console.log(chalk.hex('#4ECDC4').bold(`💾 [${timestamp}] Backup criado`));
      console.log(chalk.hex('#4ECDC4')(`   └─ Local: ${details.path}`));
      break;
      
    case 'STATS_REQUESTED':
      console.log(chalk.hex('#FFE66D').bold(`📊 [${timestamp}] Estatísticas solicitadas`));
      if (details.isGroup) {
        console.log(chalk.hex('#FFE66D')(`   └─ Grupo: ${details.groupName}`));
      }
      break;
  }
  
  // Atualizar estatísticas
  monitoringData.lastActivity = Date.now();
  if (type === 'MESSAGE_RECEIVED') monitoringData.messagesReceived++;
  if (type === 'COMMAND_EXECUTED') monitoringData.commandsExecuted++;
  if (details.isGroup && details.groupId) monitoringData.groupsActive.add(details.groupId);
}

/* ===========================
   ⛏️ FUNÇÕES AUXILIARES
   =========================== */
function getTime() {
  return new Date().toLocaleTimeString("pt-BR");
}

function getTipoMensagem(msg) {
  if (msg.message?.stickerMessage) return "Figurinha";
  if (msg.message?.imageMessage) return "Imagem";
  if (msg.message?.videoMessage) return "Vídeo";
  if (msg.message?.audioMessage) return "Áudio";
  if (msg.message?.documentMessage) return "Documento";
  return "Texto";
}

async function getPermissions(sock, groupJid, participant, BOT_PHONE) {
  try {
    const metadata = await sock.groupMetadata(groupJid);
    const admins = metadata.participants
      .filter(p => p.admin !== null)
      .map(p => p.id);

    return {
      isAdmin: admins.includes(participant),
      isBotAdmin: admins.includes(BOT_PHONE + "@s.whatsapp.net"),
      isOwnerGroup: metadata.owner === participant,
      groupName: metadata.subject,
    };
  } catch {
    return { isAdmin: false, isBotAdmin: false, isOwnerGroup: false, groupName: "Grupo" };
  }
}

// ===========================
// 📊 SIMILARIDADE ENTRE STRINGS
// ===========================
function similaridade(str1, str2) {
  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();

  const match = [...str1].filter(char => str2.includes(char)).length;
  const score = (match * 2) / (str1.length + str2.length) * 100;
  return score;
}

/* ===========================
   🛡️ SISTEMA DE ANTI-LINK
   =========================== */
const linkRegex = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|discord\.gg\/)/i;

async function verificarMensagem(sock, from, msg, body, isGroup, BOT_PHONE) {
  if (!linkRegex.test(body || "")) return false;

  const gp = groupState.get(from) || { antilinkGp: false };
  const antilinkAtivo = globalConfig.antilinkHard || (isGroup && gp.antilinkGp);
  if (!antilinkAtivo) return false;

  const participant = msg.key.participant || msg.key.remoteJid;
  const perms = await getPermissions(sock, from, participant, BOT_PHONE);

  if (perms.isAdmin || perms.isOwnerGroup) return false;

  await sock.sendMessage(from, { 
    text: "🚫 *Link detectado!*\n\nLinks não são permitidos neste grupo." 
  });

  let action = 'warning_sent';
  if (perms.isBotAdmin && isGroup) {
    try {
      await sock.groupParticipantsUpdate(from, [participant], "remove");
      await sock.sendMessage(from, { text: "🔨 *Usuário removido* por enviar link." });
      action = 'user_removed';
    } catch (e) {
      action = 'removal_failed';
    }
  }
  
  logActivity('ANTILINK_TRIGGERED', {
    groupName: perms.groupName,
    groupId: from,
    action,
    isGroup
  });
  
  return true;
}

/* ===========================
   🎉 SISTEMA DE BOAS-VINDAS
   =========================== */
async function handleWelcome(sock, events) {
  if (!globalConfig.welcomeEnabled) return;
  
  if (events["group-participants"]?.update) {
    const update = events["group-participants"].update;
    const { action, participants, id } = update;
    
    if (action === "add") {
      const metadata = await sock.groupMetadata(id);
      const welcomeMsg = `🎉 *Bem-vindo(a) ao grupo ${metadata.subject}!*\n\n` +
                        `• Respeite as regras\n` +
                        `• Evite enviar links\n` +
                        `• Divirta-se!`;
      
      for (const participant of participants) {
        await sock.sendMessage(id, { text: welcomeMsg, mentions: [participant] });
        logActivity('USER_JOINED', {
          groupName: metadata.subject,
          groupId: id,
          userId: participant
        });
      }
      
      // Salvar dados atualizados do grupo
      await groupManager.saveGroupData(sock, id, 'member_added');
    }
  }
}

/* ===========================
   🧭 SISTEMA DE COMANDOS
   =========================== */
async function handleCommand(sock, from, msg, command, args, ctx) {
  const { isGroup, BOT_PHONE } = ctx;
  
  // Log do comando executado
  const perms = isGroup ? await getPermissions(sock, from, msg.key.participant, BOT_PHONE) : {};
  logActivity('COMMAND_EXECUTED', {
    command,
    isGroup,
    groupName: perms.groupName,
    groupId: from
  });

  switch (command) {
case "ping": {
  const start = Date.now();
  await sock.sendMessage(from, { text: "⏳ Calculando latência..." }, { quoted: msg })
    .then(async () => {
      const end = Date.now();
      const latency = end - start;

      // Calcula uptime em horas, minutos e segundos
      const uptimeMs = Date.now() - botStart;
      const seconds = Math.floor((uptimeMs / 1000) % 60);
      const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
      const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
      const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

      const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      await sock.sendMessage(from, {
        text: `🏓 *Pong!* Latência: *${latency}ms*\n⏱️ Uptime: *${uptime}*`,
        mentions: [msg.sender] 
      }, { quoted: msg });
    });
}
break;

case "restart": {
    // Salvar todos os dados antes de reiniciar
    console.log(chalk.yellow('🔄 Salvando dados antes do reinício...'));
    
    // Salvar buffers de mensagens
    for (const groupId of groupManager.messageBuffer.keys()) {
      groupManager.flushMessageBuffer(groupId);
    }
    
    // Criar backup
    groupManager.createBackup();
    
    // Informa ao usuário que o bot vai reiniciar
    await sock.sendMessage(from, { 
        text: "♻️ Reiniciando o bot...\n💾 Dados salvos com segurança!", 
        mentions: [msg.sender] 
    }, { quoted: msg });

    // Aguarda 3 segundos antes de reiniciar
    setTimeout(() => {
        process.exit(0);
    }, 3000);
}
break;

    case "status": {
      const gp = groupState.get(from) || { antilinkGp: false };
      const uptimeMs = Date.now() - monitoringData.startTime;
      const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      const generalStats = groupManager.getGeneralStats();
      
      const statusText = 
        `🤖 *STATUS DO ${config.NomeDoBot}*\n\n` +
        `• 📛 Prefixo: ${config.prefix}\n` +
        `• 👑 Dono: ${config.NickDono} (${config.numerodono})\n` +
        `• 🛡️ Anti-link Global: ${globalConfig.antilinkHard ? "✅ ON" : "❌ OFF"}\n` +
        `• 🎉 Boas-vindas: ${globalConfig.welcomeEnabled ? "✅ ON" : "❌ OFF"}\n` +
        `• ⏱️ Uptime: ${hours}h ${minutes}m\n` +
        `• 📨 Mensagens: ${monitoringData.messagesReceived}\n` +
        `• ⚡ Comandos: ${monitoringData.commandsExecuted}\n` +
        `• 👥 Grupos ativos: ${monitoringData.groupsActive.size}\n` +
        `• 💾 Grupos salvos: ${generalStats.totalGroups}\n` +
        `• 👤 Total membros: ${generalStats.totalMembers}\n` +
        (isGroup ? `• 🛡️ Anti-link Grupo: ${gp.antilinkGp ? "✅ ON" : "❌ OFF"}` : "");
      return sock.sendMessage(from, { text: statusText });
    }

    case "stats": {
      if (!isGroup) return sock.sendMessage(from, { text: "❌ Só funciona em grupos." });
      
      logActivity('STATS_REQUESTED', {
        isGroup,
        groupName: perms.groupName,
        groupId: from
      });
      
      const groupData = groupManager.getGroupData(from);
      if (!groupData) {
        return sock.sendMessage(from, { text: "❌ Dados do grupo não encontrados. Aguarde a próxima atualização." });
      }
      
      const statsText = 
        `📊 *ESTATÍSTICAS DO GRUPO*\n\n` +
        `• 📝 Nome: ${groupData.name}\n` +
        `• 👥 Membros: ${groupData.memberCount}\n` +
        `• 👑 Admins: ${groupData.adminCount}\n` +
        `• 📨 Mensagens: ${groupData.stats.totalMessages}\n` +
        `• 🔥 Membros ativos (24h): ${groupData.stats.activeMembers}\n` +
        `• 📅 Última atualização: ${new Date(groupData.lastUpdate).toLocaleString('pt-BR')}\n` +
        `• ⚙️ Configurações:\n` +
        `  └─ Apenas admins: ${groupData.settings.announce ? "✅" : "❌"}\n` +
        `  └─ Editar info: ${groupData.settings.restrict ? "Apenas admins" : "Todos"}`;
      
      return sock.sendMessage(from, { text: statsText });
    }

    case "backup": {
      const perms = await getPermissions(sock, from, msg.key.participant, BOT_PHONE);
      if (!perms.isAdmin && !perms.isOwnerGroup) {
        return sock.sendMessage(from, { text: "❌ Apenas administradores podem criar backups." });
      }
      
      await sock.sendMessage(from, { text: "💾 Criando backup dos dados..." });
      
      const backupPath = groupManager.createBackup();
      logActivity('BACKUP_CREATED', {
        path: backupPath,
        groupId: from,
        groupName: perms.groupName
      });
      
      return sock.sendMessage(from, { 
        text: `✅ *Backup criado com sucesso!*\n\n📁 Local: ${path.basename(backupPath)}\n⏰ Data: ${new Date().toLocaleString('pt-BR')}` 
      });
    }

    case "antilinkhard": {
      if (!isGroup) return sock.sendMessage(from, { text: "❌ Só funciona em grupos." });

      const perms = await getPermissions(sock, from, msg.key.participant, BOT_PHONE);
      if (!perms.isAdmin && !perms.isOwnerGroup) {
        return sock.sendMessage(from, { text: "❌ Apenas administradores podem usar." });
      }

      globalConfig.antilinkHard = !globalConfig.antilinkHard;
      logActivity('CONFIG_CHANGED', {
        setting: 'Anti-link Global',
        value: globalConfig.antilinkHard,
        groupId: from,
        groupName: perms.groupName
      });
      
      return sock.sendMessage(from, { text: `🛡️ Anti-link Global ${globalConfig.antilinkHard ? "✅ ATIVADO" : "❌ DESATIVADO"}` });
    }

    case "antilinkgp": {
      if (!isGroup) return sock.sendMessage(from, { text: "❌ Só funciona em grupos." });

      const perms = await getPermissions(sock, from, msg.key.participant, BOT_PHONE);
      if (!perms.isAdmin && !perms.isOwnerGroup) {
        return sock.sendMessage(from, { text: "❌ Apenas administradores podem usar." });
      }

      const gp = groupState.get(from) || { antilinkGp: false };
      gp.antilinkGp = !gp.antilinkGp;
      groupState.set(from, gp);
      
      logActivity('CONFIG_CHANGED', {
        setting: 'Anti-link Grupo',
        value: gp.antilinkGp,
        groupId: from,
        groupName: perms.groupName
      });
      
      // Salvar configuração do grupo
      await groupManager.saveGroupData(sock, from, 'settings_changed');
      
      return sock.sendMessage(from, { text: `🛡️ Anti-link do Grupo ${gp.antilinkGp ? "✅ ATIVADO" : "❌ DESATIVADO"}` });
    }

    case "ban": {
      if (!isGroup) return sock.sendMessage(from, { text: "❌ Só funciona em grupos." });

      const perms = await getPermissions(sock, from, msg.key.participant, BOT_PHONE);
      if (!perms.isAdmin && !perms.isOwnerGroup) {
        return sock.sendMessage(from, { text: "❌ Apenas administradores podem banir." });
      }
      if (!perms.isBotAdmin) {
        return sock.sendMessage(from, { text: "⚠️ Eu preciso ser admin para banir usuários." });
      }

      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const alvo = mentioned[0] || args[0];
      if (!alvo) return sock.sendMessage(from, { text: "❌ Uso: .ban @usuário" });

      const jid = alvo.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      try {
        await sock.groupParticipantsUpdate(from, [jid], "remove");
        await groupManager.saveGroupData(sock, from, 'member_removed');
        return sock.sendMessage(from, { text: "🔨 Usuário banido!" });
      } catch {
        return sock.sendMessage(from, { text: "❌ Erro ao banir." });
      }
    }

    case "welcome": {
      if (!isGroup) return sock.sendMessage(from, { text: "❌ Só funciona em grupos." });

      const perms = await getPermissions(sock, from, msg.key.participant, BOT_PHONE);
      if (!perms.isAdmin && !perms.isOwnerGroup) {
        return sock.sendMessage(from, { text: "❌ Apenas administradores podem usar." });
      }

      globalConfig.welcomeEnabled = !globalConfig.welcomeEnabled;
      logActivity('CONFIG_CHANGED', {
        setting: 'Boas-vindas',
        value: globalConfig.welcomeEnabled,
        groupId: from,
        groupName: perms.groupName
      });
      
      return sock.sendMessage(from, { text: `🎉 Boas-vindas ${globalConfig.welcomeEnabled ? "✅ ATIVADO" : "❌ DESATIVADO"}` });
    }

case "menu": {
    const helpText =
`✨━━━━━━━━━━━━✨
🌟 *COMANDOS DO ${config.NomeDoBot}*
────────────────────────
🏓 *${config.prefix}ping* → Teste a rapidez do bot
📊 *${config.prefix}status* → Verifique o status atual
📈 *${config.prefix}stats* → Estatísticas do grupo (admin)
💾 *${config.prefix}backup* → Criar backup dos dados (admin)
🚫 *${config.prefix}antilinkhard* → Anti-link global (admin)
🔗 *${config.prefix}antilinkgp* → Anti-link em grupo (admin)
👋 *${config.prefix}welcome* → Ativar boas-vindas (admin)
❌ *${config.prefix}ban @user* → Banir usuário (admin)
📜 *${config.prefix}menu* → Mostrar este menu`;

    return sock.sendMessage(from, {
        image: { url: 'https://files.catbox.moe/5rbtyz.jpg' },
        caption: helpText,
        quoted: msg
    });
}

    default:
      // 🚨 Comando inválido → gera sugestão
      let sugestao = null;
      let melhorScore = 0;

      for (let cmd of comandos2) {
        const score = similaridade(command, cmd);
        if (score > melhorScore) {
          melhorScore = score;
          sugestao = cmd;
        }
      }

      let mensagem = `🚨 *Comando inválido* 🚨\n`;

      if (sugestao && melhorScore >= 50) {
        mensagem += `Talvez você quis dizer: *${config.prefix}${sugestao}* ?\n`;
        mensagem += `📊 Similaridade: *${melhorScore.toFixed(2)}%*\n`;
      }

      mensagem += `\nUse *${config.prefix}menu* para ver todos os comandos.`;

      return sock.sendMessage(from, { text: mensagem }, { quoted: msg });
  }
}

/* ===========================
   🚀 HANDLER PRINCIPAL
   =========================== */
module.exports = async function (events, sock) {
  try {
    await handleWelcome(sock, events);

    const msg = events.messages?.[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      "";

    const BOT_PHONE = (sock?.user?.id || "").split(":")[0]?.replace(/[^0-9]/g, "");
    const messageType = getTipoMensagem(msg);
    
    // Log da mensagem recebida
    const perms = isGroup ? await getPermissions(sock, from, msg.key.participant || msg.key.remoteJid, BOT_PHONE) : {};
    logActivity('MESSAGE_RECEIVED', {
      isGroup,
      groupName: perms.groupName,
      groupId: from,
      messageType
    });
    
    // Salvar dados do grupo e mensagem se for uma mensagem de grupo
    if (isGroup) {
      await groupManager.saveGroupData(sock, from, 'message_activity');
      groupManager.saveMessage(from, msg);
    }

    // 🔥 Gatilho de palavra-chave (áudio)
    if (body.toLowerCase().includes("amor")) {
      try {
        const audioLink = "https://files.catbox.moe/4xpob7.mp3";
        const { data } = await axios.get(audioLink, { responseType: "arraybuffer" });
        await sock.sendMessage(from, {
          audio: Buffer.from(data),
          mimetype: "audio/mp4",
          ptt: true
        }, { quoted: msg });
      } catch (e) {}
    }

    // 🔥 Resposta quando digitam "prefixo"
    if (body.toLowerCase() === "prefixo") {
        await sock.sendMessage(from, { 
            text: `O prefixo de comandos é: ${config.prefix}` 
        }, { quoted: msg });
    }

    // Listener do botão
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        const buttonResponse = msg.message?.buttonsResponseMessage?.selectedButtonId;

        if (buttonResponse === 'enviar_newsletter') {
            await sock.sendMessage('120363317585508358@newsletter', {
                text: `Mensagem enviada pelo usuário ${msg.key.participant || msg.key.remoteJid}`
            });
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Sua mensagem foi enviada para a newsletter!' });
        }
    });

    if (await verificarMensagem(sock, from, msg, body, isGroup, BOT_PHONE)) return;

    if (!body.startsWith(config.prefix)) return;
    
    const args = body.slice(config.prefix.length).trim().split(/ +/);
    const command = (args.shift() || "").toLowerCase();

    await handleCommand(sock, from, msg, command, args, { isGroup, BOT_PHONE });

  } catch (error) {
    console.log(chalk.red(`❌ Erro no handler: ${error.message}`));
  }
};

// Limpeza automática de dados antigos a cada 24 horas
setInterval(() => {
  groupManager.cleanOldData();
}, 24 * 60 * 60 * 1000);


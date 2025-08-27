const path = require("path");
const pino = require("pino");
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const handler = require("./index");
const TerminalUI = require("./database/terminalUI.js");

// Banner inicial
TerminalUI.showBanner("🚀 BOT ZERO | Sistema Futurista Online 🚀");

async function connect() {
  TerminalUI.status.info("Iniciando processo de conexão...");

  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.resolve(__dirname, "database", "qr", "ted-qr")
    );

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      markOnlineOnConnect: true,
    });

    // Pareamento
    if (!state.creds.registered) {
      let phoneNumber = await TerminalUI.promptInput("📱 Informe seu número com DDI (ex: 5511999999999)");
      phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
      if (!phoneNumber) {
        TerminalUI.status.error("Número inválido! Reiniciando...");
        return connect();
      }

      try {
        const code = await sock.requestPairingCode(phoneNumber);
        TerminalUI.status.success(`TOKEN DE PAREAMENTO: ${code}`);
        TerminalUI.status.info("➡️ Abra o WhatsApp > Dispositivos Conectados > Conectar com código");
      } catch (error) {
        TerminalUI.status.error(`Erro ao gerar código: ${error.message}`);
        setTimeout(connect, 3000);
        return;
      }
    }

    // Eventos de conexão
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;

      if (connection) TerminalUI.status.connection(`Status da conexão: ${connection}`);

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          TerminalUI.status.warning("Reconectando em 5s...");
          setTimeout(connect, 5000);
        } else {
          TerminalUI.status.error("Desconectado permanentemente. Rode o bot novamente.");
        }
      } else if (connection === "open") {
        TerminalUI.status.success("CONECTADO COM SUCESSO!");
      }
    });

    sock.ev.on("creds.update", saveCreds);

    // Eventos do handler
    sock.ev.on("messages.upsert", (events) => handler(events, sock));
    sock.ev.on("group-participants.update", (events) =>
      handler({ "group-participants": { update: events } }, sock)
    );

    return sock;
  } catch (error) {
    TerminalUI.status.error(`ERRO FATAL: ${error}`);
    setTimeout(connect, 5000);
  }
}

connect();
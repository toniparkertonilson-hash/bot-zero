// terminalUI.js
const chalk = require("chalk");
const readline = require("readline");

// Cores personalizadas
const colors = {
  primary: '#00D4FF',
  secondary: '#FF6B6B',
  success: '#4ECDC4',
  warning: '#FFE66D',
  error: '#FF6B6B',
  info: '#A8E6CF',
  dark: '#2C3E50',
  light: '#ECF0F1'
};

// Banner futurista melhorado
function showBanner(title) {
  const width = 80;
  const border = '═'.repeat(width);
  const padded = ` ${title} `.padStart((width + title.length) / 2).padEnd(width);
  
  console.log(chalk.hex(colors.primary).bold(`╔${border}╗`));
  console.log(chalk.hex(colors.primary).bold(`║${chalk.bgHex(colors.dark).whiteBright.bold(padded)}║`));
  console.log(chalk.hex(colors.primary).bold(`╚${border}╝`));
  console.log('');
}

// Sistema de logs melhorado com ícones e cores
const status = {
  info: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex(colors.info).bold(`ℹ️  [${timestamp}] `) + chalk.hex(colors.info)(text));
  },
  
  success: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex(colors.success).bold(`✅ [${timestamp}] `) + chalk.hex(colors.success)(text));
  },
  
  warning: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex(colors.warning).bold(`⚠️  [${timestamp}] `) + chalk.hex(colors.warning)(text));
  },
  
  error: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex(colors.error).bold(`❌ [${timestamp}] `) + chalk.hex(colors.error)(text));
  },
  
  connection: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex(colors.primary).bold(`🔗 [${timestamp}] `) + chalk.hex(colors.primary)(text));
  },
  
  message: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex('#87CEEB').bold(`📨 [${timestamp}] `) + chalk.hex('#87CEEB')(text));
  },
  
  command: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex('#98FB98').bold(`⚡ [${timestamp}] `) + chalk.hex('#98FB98')(text));
  },
  
  save: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex('#DDA0DD').bold(`💾 [${timestamp}] `) + chalk.hex('#DDA0DD')(text));
  },
  
  antilink: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex('#FF4500').bold(`🚫 [${timestamp}] `) + chalk.hex('#FF4500')(text));
  },
  
  welcome: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex('#FF69B4').bold(`👋 [${timestamp}] `) + chalk.hex('#FF69B4')(text));
  },
  
  config: (text) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(chalk.hex('#40E0D0').bold(`⚙️  [${timestamp}] `) + chalk.hex('#40E0D0')(text));
  }
};

// Função de prompt melhorada
function promptInput(label) {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
  });
  
  return new Promise((resolve) => {
    const prompt = chalk.hex(colors.primary).bold(`${label}: `);
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Função para mostrar estatísticas
function showStats(stats) {
  const border = '─'.repeat(60);
  console.log(chalk.hex(colors.primary)(`┌${border}┐`));
  console.log(chalk.hex(colors.primary)(`│${chalk.bgHex(colors.dark).whiteBright.bold(' ESTATÍSTICAS DO BOT '.padStart(35).padEnd(60))}│`));
  console.log(chalk.hex(colors.primary)(`├${border}┤`));
  
  Object.entries(stats).forEach(([key, value]) => {
    const line = `│ ${key.padEnd(25)} ${String(value).padStart(30)} │`;
    console.log(chalk.hex(colors.primary)(line));
  });
  
  console.log(chalk.hex(colors.primary)(`└${border}┘`));
  console.log('');
}

// Função para mostrar progresso
function showProgress(current, total, label = 'Progresso') {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 30);
  const empty = 30 - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const progressText = `${label}: [${bar}] ${percentage}% (${current}/${total})`;
  
  console.log(chalk.hex(colors.success)(progressText));
}

// Função para limpar terminal
function clearScreen() {
  console.clear();
}

// Função para mostrar separador
function showSeparator(text = '') {
  const width = 80;
  if (text) {
    const padding = Math.max(0, (width - text.length - 2) / 2);
    const line = '─'.repeat(Math.floor(padding)) + ` ${text} ` + '─'.repeat(Math.ceil(padding));
    console.log(chalk.hex(colors.primary)(line));
  } else {
    console.log(chalk.hex(colors.primary)('─'.repeat(width)));
  }
}

// Função para mostrar tabela
function showTable(headers, rows) {
  const colWidths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => String(row[i] || '').length))
  );
  
  // Header
  const headerRow = '│ ' + headers.map((header, i) => 
    header.padEnd(colWidths[i])
  ).join(' │ ') + ' │';
  
  const separator = '├' + colWidths.map(width => 
    '─'.repeat(width + 2)
  ).join('┼') + '┤';
  
  const topBorder = '┌' + colWidths.map(width => 
    '─'.repeat(width + 2)
  ).join('┬') + '┐';
  
  const bottomBorder = '└' + colWidths.map(width => 
    '─'.repeat(width + 2)
  ).join('┴') + '┘';
  
  console.log(chalk.hex(colors.primary)(topBorder));
  console.log(chalk.hex(colors.primary).bold(headerRow));
  console.log(chalk.hex(colors.primary)(separator));
  
  // Rows
  rows.forEach(row => {
    const rowText = '│ ' + row.map((cell, i) => 
      String(cell || '').padEnd(colWidths[i])
    ).join(' │ ') + ' │';
    console.log(chalk.hex(colors.info)(rowText));
  });
  
  console.log(chalk.hex(colors.primary)(bottomBorder));
}

module.exports = { 
  showBanner, 
  status, 
  promptInput, 
  showStats, 
  showProgress, 
  clearScreen, 
  showSeparator, 
  showTable,
  colors 
};


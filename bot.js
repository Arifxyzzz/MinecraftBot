const mineflayer = require('mineflayer');
const readline = require('readline');
const ProxyAgent = require('proxy-agent');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log(`
   _____  ____  __________________.___.
  /  _  \\ \\   \\/  /\\____    /\\__  |   |
 /  /_\\  \\ \\     /   /     /  /   |   |
/    |    \\/     \\  /     /_  \\____   |
\\____|__  /___/\\  \\/_______ \\ / ______|
        \\/      \\_/        \\/ \\/
  `);

  const ip = await askQuestion('Enter server IP: ');
  const portInput = await askQuestion('Enter server port (default 25565): ');
  const port = portInput ? parseInt(portInput) : 25565;
  const serverCountInput = await askQuestion('Enter number of servers: ');
  const serverCount = parseInt(serverCountInput);
  const baseNickname = await askQuestion('Enter base nickname: ');
  const versionInput = await askQuestion('Enter Minecraft version (optional, e.g. 1.19.4, press enter to skip): ');
  const password = await askQuestion('Enter password (optional, press enter to skip): ');
  let confirmPassword = '';
  if (password) {
    confirmPassword = await askQuestion('Enter confirm password (optional, press enter to skip): ');
  }
  const spamChat = await askQuestion('Enter spam chat text or "false" to disable: ');
  const proxyInput = await askQuestion('Enter HTTP proxies as comma-separated list (optional, press enter to skip): ');

  rl.close();

  if (isNaN(port) || isNaN(serverCount) || !baseNickname) {
    console.log('Invalid input. Exiting.');
    process.exit(1);
  }

  const proxies = proxyInput ? proxyInput.split(',').map(p => p.trim()).filter(p => p.length > 0) : [];

  let botIndex = 1;
  const bots = [];

  function createBot(nickname, proxy) {
    const options = {
      host: ip,
      port: port,
      username: nickname
    };
    if (versionInput && versionInput.trim() !== '') {
      options.version = versionInput.trim();
    } else {
      options.version = 'auto';
    }
    if (proxy) {
      options.agent = ProxyAgent(proxy);
      console.log(`Bot ${nickname} will connect using proxy: ${proxy}`);
    }

    let bot;
    try {
      bot = mineflayer.createBot(options);
    } catch (err) {
      console.log(`Failed to create bot ${nickname}: ${err.message}`);
      return null;
    }

    if (!bot) {
      console.log(`Bot ${nickname} creation returned null.`);
      return null;
    }

    bot.on('login', () => {
      console.log(`Bot ${nickname} logged in.`);
      if (password) {
        if (confirmPassword) {
          bot.chat(`/register ${password} ${confirmPassword}`);
          console.log(`Bot ${nickname} sent register command with password and confirm password.`);
        } else {
          bot.chat(`/register ${password}`);
          console.log(`Bot ${nickname} sent register command with password.`);
        }
      }
      if (spamChat.toLowerCase() !== 'false') {
        setInterval(() => {
          bot.chat(spamChat);
        }, 5000);
        console.log(`Bot ${nickname} started spamming chat: ${spamChat}`);
      }
    });

    bot.on('error', err => {
      console.log(`Bot ${nickname} error:`, err.message);
    });

    bot.on('end', () => {
      console.log(`Bot ${nickname} disconnected.`);
    });

    return bot;
  }

  // Spawn initial bots for the number of servers specified
  for (let i = 0; i < serverCount; i++) {
    const nickname = i === 0 ? baseNickname : baseNickname + i;
    const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
    bots.push(createBot(nickname, proxy));
    botIndex++;
  }

  // Continuously add bots with incremented nicknames every 5 seconds
  setInterval(() => {
    const nickname = baseNickname + botIndex;
    const proxy = proxies.length > 0 ? proxies[botIndex % proxies.length] : null;
    bots.push(createBot(nickname, proxy));
    botIndex++;
  }, 5000);
}

main();

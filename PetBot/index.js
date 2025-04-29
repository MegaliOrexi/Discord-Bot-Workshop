const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config({ path: '../.env' });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Pet database (userID -> pet)
const pets = new Map();

class VirtualPet {
  constructor() {
    this.stats = {
      hunger: 50,
      happiness: 50,
      energy: 100,
      level: 1
    };
    this.species = 'Egg';
    this.lastUpdated = Date.now();
  }

  evolve() {
    if (this.stats.level === 1 && this.stats.happiness >= 75) {
      this.species = 'Dragon Hatchling';
      this.stats.level = 2;
    } else if (this.stats.level === 2 && this.stats.happiness >= 90) {
      this.species = 'Ancient Dragon';
      this.stats.level = 3;
    }
  }
}

// Background simulation
setInterval(() => {
  const now = Date.now();
  pets.forEach((pet, userId) => {
    const hoursPassed = (now - pet.lastUpdated) / 3600000;
    
    pet.stats.hunger = Math.min(100, pet.stats.hunger + 10 * hoursPassed);
    pet.stats.energy = Math.max(0, pet.stats.energy - 5 * hoursPassed);
    
    if (pet.stats.hunger > 80) {
      pet.stats.happiness = Math.max(0, pet.stats.happiness - 5 * hoursPassed);
    }
    
    pet.evolve();
    pet.lastUpdated = now;
  });
}, 30000); // Update every 30 seconds

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Adopt command
  if (message.content.toLowerCase() === '!adopt') {
    if (!pets.has(message.author.id)) {
      pets.set(message.author.id, new VirtualPet());
      message.reply('🎉 You adopted a mysterious egg! Use `!feed` and `!play` to care for it!');
    } else {
      message.reply('You already have a pet!');
    }
  }

  // Status command
  if (message.content.toLowerCase() === '!status') {
    const pet = pets.get(message.author.id);
    if (!pet) return message.reply('Adopt a pet first with `!adopt`!');
    
    const statusMessage = [
      `**${pet.species}** - Level ${pet.stats.level}`,
      `❤️ Hunger: ${Math.round(pet.stats.hunger)}%`,
      `😊 Happiness: ${Math.round(pet.stats.happiness)}%`,
      `⚡ Energy: ${Math.round(pet.stats.energy)}%`
    ].join('\n');
    
    message.reply(statusMessage);
  }

  // Feed command
  if (message.content.toLowerCase() === '!feed') {
    const pet = pets.get(message.author.id);
    if (!pet) return message.reply('Adopt a pet first!');
    
    pet.stats.hunger = Math.max(0, pet.stats.hunger - 30);
    pet.stats.happiness += 10;
    message.reply('🍖 Your pet happily eats the food!');
  }

  // Play command
  if (message.content.toLowerCase() === '!play') {
    const pet = pets.get(message.author.id);
    if (!pet) return message.reply('Adopt a pet first!');
    
    pet.stats.happiness = Math.min(100, pet.stats.happiness + 20);
    pet.stats.energy = Math.max(0, pet.stats.energy - 15);
    message.reply('🎾 Your pet plays fetch! Energy -15, Happiness +20');
  }
});

client.login(process.env.PET_BOT_TOKEN);
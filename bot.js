// https://discord.js.org/#/docs/main/stable/general/welcome

require("dotenv").config()
const fetch = require("node-fetch");
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
const { Client, MessageEmbed } = require('discord.js');
const client = new Client();

const CATEGORIES = {
    "general": 9,
    "books": 10,
    "film": 11,
    "music": 12,
    "theatre": 13,
    "television": 14,
    "videogames": 15,
    "boardgames": 16,
    "nature": 17,
    "computers": 18,
    "mathematics": 19,
    "mythology": 20,
    "sports": 21,
    "geography": 22,
    "history": 23,
    "politics": 24,
    "art": 25,
    "celebrities": 26,
    "animals": 27,
    "vehicles": 28,
    "comics": 29,
    "gadgets": 30,
}

let participants = new Map();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    if (message.content === "!help") {
        const embed = new MessageEmbed()
        .setTitle("I know the following commands")
        .setColor(0xff0000)
        .setDescription(
            "`!help` Print possible commands\n" +
            "`!ping` Answer with pong\n" + 
            "`!avatar` Show the user avatar\n" +
            "`!quiz` Start a multiple choice quiz"
        );
        message.channel.send(embed);
    }

    if (message.content === '!ping') {
        message.channel.send('pong');
    }

    if (message.content === '!avatar') {
        message.reply(message.author.displayAvatarURL());
    }

    if (message.content.split(" ")[0] === "!quiz") {
        let amount = 3;
        let categoryId = getRandomInt(9, 30);
        let difficulty = "medium";
        message.content.split(" ").forEach(arg => {
            if (!isNaN(arg)) {
                amount = parseInt(arg);
            }
            if (["easy", "medium", "hard"].includes(arg)) {
                difficulty = arg;
            }
            if (arg.toLowerCase() in CATEGORIES) {
                categoryId = CATEGORIES[arg.toLowerCase()];
            }
        });
        getQuizData(amount, categoryId, difficulty).then(quiz => {
            message.channel.quiz = quiz;
            message.channel.send(`Start a ${getKeyByValue(CATEGORIES, categoryId)} quiz with ${amount} questions on ${difficulty} difficulty`);
            participants = new Map();
            askQuestion(message.channel);
        });
    }
});

client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'bot-test');
    if (!channel) return;
    channel.send(`Welcome on the discord server, ${member}!`);
});

client.login(process.env.BOT_TOKEN);

async function getQuizData(amount, categoryId, difficulty) {
    let response = await fetch(`https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=${difficulty}&type=multiple`);
    let quizdata = await response.json();
    return quizdata.results;
}

function askQuestion(channel) {
    if (channel.quiz.length === 0) {
        channel.send("The quiz has ended. Here are the results:");
        participants = new Map([...participants.entries()].sort((a, b) => b[1] - a[1]));
        let podium = 1;
        for (let [key, value] of participants) {
            if (podium > 0) {
                channel.send(`${key}: ${value} :trophy:`);
                --podium;
            } else {
                channel.send(`${key}: ${value}`);
            }
        }
        return;
    }
    let quizRound = channel.quiz.shift();
    let multipleChoice = [];
    multipleChoice.push(entities.decode(quizRound.correct_answer));
    quizRound.incorrect_answers.forEach(answer => {
        multipleChoice.push(entities.decode(answer));
    });
    shuffle(multipleChoice);
    const isCorrectAnswer = response => {
        return response.content.toLowerCase() === quizRound.correct_answer.toLowerCase();
    };
    const embed = new MessageEmbed()
    .setTitle(entities.decode(quizRound.question))
    .setColor(0xff0000)
    .setDescription(multipleChoice);
    channel.send(embed).then(() => {
        channel.awaitMessages(isCorrectAnswer, { max: 1, time: 15000, errors: ['time'] })
            .then(collected => {
                channel.send(`${collected.first().author} got the correct answer!`);
                if (!participants.get(collected.first().author)) {
                    participants.set(collected.first().author, 1);
                } else {
                    participants.set(collected.first().author, participants.get(collected.first().author) + 1);
                }
                setTimeout(askQuestion, 2000, channel);
            })
            .catch(collected => {
                channel.send('Looks like nobody got the answer this time.');
                setTimeout(askQuestion, 2000, channel);
            });
        // TODO Add "single" mode, with placeholders, setTimeout() and clearTimeout()
    });
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getKeyByValue(object, value) { 
    return Object.keys(object).find(key => object[key] === value); 
} 

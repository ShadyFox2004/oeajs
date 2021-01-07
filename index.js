/*
 * 	MODULES HERE
 */
const ytdl = require('ytdl-core');
const Discord = require('discord.js');

const {prefix, token} = require('./config.json');

const client = new Discord.Client();

client.login(token);

const queue = new Map();	//	Where really are my jams

/*
 * basicly Hello World
 */

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});


/*
 *	Wen I recieve a message
 */
client.on('message', async message => {
	if (message.author.bot) return;		//	If i talk to a bot ignore him.
	if (!message.content.startsWith(prefix)) return;	//	I do not listen if you dont call me
	const serverQueue = queue.get(message.guild.id);	//	This is where i store the songs
	const args = message.content.split(" ");	//	First I divide it  in arguments


	if (message.content.startsWith(`${prefix}play`)) {	//	If you say play , I execute your order
		execute(message, serverQueue, args);
		return;
	} else if (message.content.startsWith(`${prefix}skip`)) {	//	If you say skip, I skip
		skip(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}stop`)) {	// 	If you say stop, I stop
		stop(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}vol`)) {
		setVolume(message, serverQueue, args);
		return;
	} else {	//	If i do not understand, I reply.
		message.reply(', I do not recall that function.');
	}
});


async function execute(message, serverQueue,args) {	//	This is how I execute your order
	const voiceChannel = message.member.voice.channel;	//	Where you are ?
	if (!voiceChannel)	//	Check if you are in a voice channel
		return message.reply('How can you ear me if you aren\'t in a voice channel?');
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has("CONNECT") || !permissions.has("SPEAK"))	//	If you do not have the rights to speak, neither do I.
		return message.reply('You do not have the rights to command me.');
	
	// All is correct than procede
	
	const songInfo = await ytdl.getInfo(args[1]);	//	Search the song on youtube 
	

	const song = await {
		title: songInfo.videoDetails.title,
		url: songInfo.videoDetails.video_url,
	};
	console.log(songInfo);
	console.log(song)

	if (!serverQueue) {	//	If there is no serverQueue
		const queueConstruct = {	//	Create it
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: parseInt(args[2]),
			playing: true
		};

		queue.set(message.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(message.guild, queueConstruct.songs[0]);
		} catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.reply(err);
		}
	} else {
		serverQueue.songs.push(song);
		return message.reply(`${song.title} will play later.`);
	}
}

function skip(message, serverQueue) { 
	if (!message.member.voice.channel)
		return message.reply("at least try to listen to  it!");
	if (!serverQueue) 
		return message.reply("what can I skip wen it\'s oblivion!");
	serverQueue.connection.dispatcher.end();
	play(message.guild, serverQueue.songs[0]);
	message.reply("next than!");
}	

function stop(message, serverQueue) {
	if (!message.member.voice.channel) 
		return message.reply("I can't ! You aren\'t listening, why should I stop?");
	serverQueue.songs = [];
	serverQueue.connection.dispatcher.end();
	message.reply("ok I shutup...");
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);
	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection
		.play(ytdl(song.url))
		.on("finish", () => {
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[1]);
		})
		.on("error", error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Listen to **${song.title}**`);
}

function setVolume(message, serverQueue, args) {
	const amount = parseInt(args[1]);
	if(isNaN(amount))
		return message.reply("send a number pls!");
	else if (amount < 2 || amount > 100) 
		return message.reply(`${amount} is lower than 2 or higher than 10`);
	if (!serverQueue)
		return message.reply("My tail is oblivion!");
	serverQueue.volume = amount;
	return message.reply(`the amount of noise that I generate is now set ${amount}!`);
}

const Discord = require("discord.js")
const Docker = require('dockerode');
const parser = require("discord-command-parser");
const DockerEvents = require('docker-events');
const stream = require('stream');


const docker = new Docker({socketPath: '/var/run/docker.sock'});
const emitter = new DockerEvents({
  docker: docker,
});

emitter.on('connect', () => {
  console.log("connected to docker events");
});

emitter.on("start", function(message) {
  console.log("container started: %j", message);
  if (message.Type === 'container' && message.Action === 'start' && message.Actor.Attributes.name === CONTAINER_NAME) {
    logUntilMessage(docker.getContainer(message.id), "Initialisation WebServerPlugin", 15).then(() => {
      sentToChannel(CHANNEL, "jeu démarré, prêt pour recevoir des connexions");
    }).catch((err) => {
      sentToChannel(CHANNEL, "erreur durant la détéction du serveur: " + err);
    });
  }
});

emitter.on("stop", function(message) {
  console.log("container stopped: %j", message);
  if (message.Type === 'container' && message.Action === 'stop' && message.Actor.Attributes.name === CONTAINER_NAME) {
    sentToChannel(CHANNEL, "serveur arrêté");
  }
});

emitter.start();

const CONTAINER_NAME = process.env.CONTAINER_NAME
const CHANNEL = process.env.CHANNEL;

function getContainer(message) {
  return new Promise((resolve, reject) => {
    docker.listContainers({all: true, filters: JSON.stringify({name: [CONTAINER_NAME]})}, (err, containers) => {
      if (err) {
        console.error("error ", err);
        message.channel.send(`OOPS, error ${err}`);
        reject(err);
      } else if (containers.length === 0) {
        message.channel.send(`OOPS, pas de container ici avec le nom ${CONTAINER_NAME}. revoyez la config du bot`);
        reject('no container found');
      } else {
        res = containers[0];
        res.container = docker.getContainer(res.Id);
        resolve(res);
      }
    });
  });
}

function logUntilMessage(container, message, timeout=200) {
  return new Promise((resolve, reject) => {
    container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 0,
    }, function(err, stream){
      if(err) {
        reject(err);
        return;
      }
      stream.on('data', (chunk) => {
        let str = chunk.toString('utf8');
        if (str.includes(message) ) {
          resolve(str);
          console.log("message sentinel detected: ", str);
          stream.destroy();
        }
      });
      stream.on('end', function(){
        reject('EOF');
      });


      setTimeout(function() {
        stream.destroy();
        reject("timout");
      }, timeout * 1000);
    });
  });
}

function sentToChannel(channelname, message) {
  client.guilds.cache.each((guild) => {
    guild.channels.cache.filter(channel => channel.name === channelname).each(channel => {
      channel.send(message);
    });
  });
}

// discord
const client = new Discord.Client()

client.on("ready", () => {
  console.log(`connecté a discord avec ${client.user.username}`);
});

client.on("message", message => {
  const parsed = parser.parse(message, "!");
  if (!parsed.success) return;

  switch (parsed.command) {
    case 'dlist':
      message.channel.send('docker images list: ');
      docker.listContainers({all: true}, (err, containers) => {
        console.log(containers[0]);
        for (const container of containers) {
          message.channel.send(`- ${container.Names[0]}: ${container.State} ${container.Status}`);
        }
      });
      break;
    case 'status':
      getContainer(message).then(container => {
        message.channel.send(`${container.Names[0]} => ${container.State} ${container.Status}`);
      });
      break;
    case 'stop':
      getContainer(message).then(container => {
        message.channel.send(`${container.Names[0]} en cours d'arrêt`);
        container.container.stop().then(() => {
          message.channel.send(`${container.Names[0]} arrêté`);
        });
      });
      break;
    case 'start':
      getContainer(message).then(container => {
        message.channel.send(`${container.Names[0]} en cours de démarrage`);
        container.container.start().then(() => {
          message.channel.send(`${container.Names[0]} démarré, lancement du serveur`);
        });
      });
      break;
    case 'ping':
      message.reply("Pong! bien vue " + message.author.username);
      break;
    default:
      message.channel.send(`unknow command ${parsed.command}. t'a rien d'autre a faire ${message.author.username} ?`);
      break;
  }
  if (message.startswith === "ping") {
  }
})

client.on('guildCreate', guild => {
  const channel = guild.channels;
  console.log("guild create");
});

client.login(process.env.TOKEN)
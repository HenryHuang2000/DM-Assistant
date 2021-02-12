// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");
require('dotenv').config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});


// A value from 0 to 23 representing the hour at which to send a message. Defaults to 4pm.
let sendTimeHour = 16;
// A value from 0 to 59 representing the minute at which to send a message. Defaults to 0.
let sendTimeMinute = 0;
// Number of hours between sending notifications.
let sendFrequency = 24;
let targetChannelId;
let nextPostTime;
let myTimer;
let targetCharts = ['no first response from AU-Sydney', 'open dispatch from AU-Sydney'];

//////////////////////////////////////////////////////////
///////////////// SLASH COMMANDS /////////////////////////
//////////////////////////////////////////////////////////

app.command('/enable', async ({ command, ack, say }) => {
    try {
        await ack();
        targetChannelId = command.channel_id;
        parseParameters(command.text);
        await say(printInfo());
        stopScheduling();
        startScheduling();
        console.log('scheduling has been started.')
    } catch (error) {
        console.log(error);
    }
});
app.command('/disable', async ({ command, ack, say }) => {
    try {
        await ack();
        await say('Automatic duty manager end of day notifications have been disabled.');
        stopScheduling();
        console.log('scheduling has been stopped.')
    } catch (error) {
        console.log(error);
    }
});
app.command('/info', async ({ command, ack, say }) => {
    try {
        await ack();
        await say(printInfo());
    } catch (error) {
        console.log(error);
    }
});


////////////////////////////////////////////////////////////
//////////////// HELPER FUNCTIONS //////////////////////////
////////////////////////////////////////////////////////////

// Every 30 seconds, try to post an end of day message.
function startScheduling() {
    nextPostTime = new Date();
    nextPostTime.setHours(sendTimeHour, sendTimeMinute);
    myTimer = setInterval(getData, 30000);
}

function stopScheduling() {
    clearInterval(myTimer);
}

async function postEodMessage(text) {

    // Increment the nextPostTime.
    nextPostTime.setHours(nextPostTime.getHours() + sendFrequency);

    // Try to send the message.
    try {
        await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: targetChannelId,
            text: text,
        });
        console.log(`Message posted. Next post time at ${nextPostTime}.`);
    }
    catch (error) {
        console.error(error);
    }
}

// Mainly used to get the userId of the support bot.
async function getUserId(name, isBot) {
    const result = await app.client.users.list({token: process.env.SLACK_BOT_TOKEN});
    for (let member of result.members) {
        if (member['name'] === name && member['is_bot'] === isBot) {
            return member['id'];
        }
    }
}

function parseParameters(text) {
    let params = text.split(" ");
    for (let param of params) {
        let splitParam = param.split("=");
        if (splitParam.length !== 2) continue;
        switch (splitParam[0]) {
            case 'setHour':
                sendTimeHour = splitParam[1];
                break;
            case 'setMinute':
                sendTimeMinute = splitParam[1];
                break;
            case 'setFrequency':
                sendFrequency = splitParam[1];
            default:
        }
    }
}

function printInfo() {
    let text = `*Messages will be sent at ${sendTimeHour.toString().padStart(2, '0')}:${sendTimeMinute.toString().padStart(2, '0')}*\n`;
    text += `*Frequency*: Every ${sendFrequency} hours\n`;
    text += `*Fetching charts*: ${targetCharts.join(', ')}.\n`
    return text;
}



////////////////////////////////////////////////////////////
//////////////////// DATA RETRIEVAL ////////////////////////
////////////////////////////////////////////////////////////

// Messages the support bot to trigger collecting data.
async function getData() {

    // Check to make sure it is the scheduled time.
    if (nextPostTime.getTime() - Date.now() > 0) return;

    try {
        for (let chartName of targetCharts) {
            await app.client.chat.postMessage({
                token: process.env.SLACK_BOT_TOKEN,
                channel: await getUserId('supportbot', true),
                text: chartName,
            });
        }

    } catch (error) {
        console.log(error);
    }

}
// Listens to the support bot's response. Then parses and extracts the data. Assumes that messages are received in order.
app.message(async ({ message, say }) => {
    let outputText;
    if (message.user === await getUserId('supportbot', true)) {
        // Parse the data to extract the relevant info.
        // Extract the chart name. The format is "details for  {chart name} are".
        let chartName = message.text.split("are")[0].slice(13);
        outputText = '*' + chartName + '*\n';

        let cases = message.text.split("Case Number:\n");
        // Remove the chartName section.
        cases.shift();
        // Extract the case number and case owner.
        for (let c of cases) {
            let fields = c.split('\n');
            outputText += fields[0] + ' - ' + fields[2] + '\n';
        }

    }

    await postEodMessage(outputText);
});

//////////////////////////////////////////////////
//////////////////// INIT ////////////////////////
//////////////////////////////////////////////////

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log("⚡️ Bolt app is running!");
})();
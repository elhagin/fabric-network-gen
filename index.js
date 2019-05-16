const inquirer = require('inquirer');
const writeComposeFile = require('./dockerComposeWriter');
const writeConfigTx = require('./configTxWriter');
let networkData = {};
let anchorPeers = new Map();

const questions = [
    {
        type: 'input',
        name: 'domainName',
        message: 'Enter your domain name...',
        default: 'example.com'
    },
    {
        type: 'input',
        name: 'nOrgs',
        message: 'Enter the number of organizations in the network...',
        default: 0
    },
    {
        type: 'confirm',
        name: 'couchDB',
        message: 'Do you want to use CouchDB?',
        default: true
    },
    {
        type: 'input',
        name: 'orderer',
        message: 'Enter the orderer\'s name...',
        default: 'orderer'
    }
];

inquirer.prompt(questions).then(async answers => {
    networkData['domainName'] = answers.domainName;
    networkData['nOrgs'] = answers.nOrgs;
    networkData['couchDB'] = answers.couchDB;
    networkData['orderer'] = answers.orderer;
    networkData['nOrgs'] = answers.nOrgs;
    networkData['orgs'] = [];

    const orgQuestions = [
        {
            type: 'input',
            name: 'orgName',
            message: 'Enter an organization name...'
        },
        {
            type: 'input',
            name: 'nPeers',
            message: 'Enter the number of peers in this organization...'
        }
    ];
    for (i = 0; i < answers.nOrgs; i++) {
        const answers = await inquirer.prompt(orgQuestions);
        const org = {
            orgName: answers.orgName,
            nPeers: answers.nPeers
        };

        networkData.orgs.push(org);
        // console.log(networkData);
    }
    writeComposeFile(networkData, anchorPeers);
    writeConfigTx(networkData, anchorPeers);
});

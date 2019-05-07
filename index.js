const inquirer = require('inquirer');
const fs = require('fs');
const yaml = require('yaml');
let networkData = {};

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
        console.log(networkData);
    }
    writeComposeFile();
});

function writeComposeFile() {
    let dockerComposeObj = {
        version: '2',
        volumes: {},
        networks: {
            'basic': null
        },
        services: {}
    };

    let caCount = 1;
    let peerPort = 7051;
    let caPort = 7054;

    const ordererContainer = `${networkData.orderer}.${networkData.domainName}`;
    dockerComposeObj.volumes[ordererContainer] = null;
    dockerComposeObj.services[ordererContainer] = {
        container_name: ordererContainer,
        image: 'hyperledger/fabric-orderer:1.4',
        environment: [
            'FABRIC_LOGGING_SPEC=INFO',
            'ORDERER_GENERAL_LISTENADDRESS=0.0.0.0',
            'ORDERER_GENERAL_GENESISMETHOD=file',
            'ORDERER_GENERAL_GENESISFILE=/var/hyperledger/orderer/orderer.genesis.block',
            'ORDERER_GENERAL_LOCALMSPID=OrdererMSP',
            'ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp',
            'ORDERER_GENERAL_TLS_ENABLED=true',
            'ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key',
            'ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt',
            'ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]',
            'ORDERER_KAFKA_TOPIC_REPLICATIONFACTOR=1',
            'ORDERER_KAFKA_VERBOSE=true',
            'ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/var/hyperledger/orderer/tls/server.crt',
            'ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/var/hyperledger/orderer/tls/server.key',
            'ORDERER_GENERAL_CLUSTER_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]'
        ],
        working_dir: '/opt/gopath/src/github.com/hyperledger/fabric',
        command: 'orderer',
        volumes: [
            '../channel-artifacts/genesis.block:/var/hyperledger/orderer/orderer.genesis.block',
            `../crypto-config/ordererOrganizations/${networkData.domainName}/orderers/${ordererContainer}/msp:/var/hyperledger/orderer/msp`,
            `../crypto-config/ordererOrganizations/${networkData.domainName}/orderers/${ordererContainer}/tls/:/var/hyperledger/orderer/tls`,
            `${ordererContainer}:/var/hyperledger/production/orderer`
        ],
        ports: [
            '7050:7050'
        ],
        networks: ['basic']
    };

    networkData.orgs.forEach(org => {
        const orgDomain = `${org.orgName}.${networkData.domainName}`;
        const caContainer = `ca.${org.orgName}.${networkData.domainName}`;
        dockerComposeObj.services[caContainer] = {
            image: 'hyperledger/fabric-ca:1.4',
            environment: [
                'FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server',
                `FABRIC_CA_SERVER_CA_NAME=ca-${org.orgName}`,
                'FABRIC_CA_SERVER_TLS_ENABLED=true',
                `FABRIC_CA_SERVER_TLS_CERTFILE=/etc/hyperledger/fabric-ca-server-config/${caContainer}-cert.pem`,
                `FABRIC_CA_SERVER_TLS_KEYFILE=/etc/hyperledger/fabric-ca-server-config/CA${caCount}_PRIVATE_KEY`
            ],
            ports: [
                `${caPort}:7054`
            ],
            command: `sh -c 'fabric-ca-server start --ca.certfile /etc/hyperledger/fabric-ca-server-config/${caContainer}-cert.pem --ca.keyfile /etc/hyperledger/fabric-ca-server-config/CA${caCount}_PRIVATE_KEY -b admin:adminpw -d'`,
            volumes: [
                `./crypto-config/peerOrganizations/${orgDomain}/ca/:/etc/hyperledger/fabric-ca-server-config`
            ],
            container_name: caContainer,
            networks: ['basic']
        };

        const anchorPeerPort = peerPort;
        for (i = 0; i < org.nPeers; i++) {
            const peerContainer = `peer${i}.${orgDomain}`;
            dockerComposeObj.volumes[peerContainer] = null;
            dockerComposeObj.services[peerContainer] = {
                container_name: peerContainer,
                image: 'hyperledger/fabric-peer:1.4',
                environment: [
                    'CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock',
                    'CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${COMPOSE_PROJECT_NAME}_basic',
                    'FABRIC_LOGGING_SPEC=INFO',
                    'CORE_PEER_TLS_ENABLED=true',
                    'CORE_PEER_GOSSIP_USELEADERELECTION=true',
                    'CORE_PEER_GOSSIP_ORGLEADER=false',
                    'CORE_PEER_PROFILE_ENABLED=true',
                    'CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt',
                    'CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key',
                    'CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt',
                    `CORE_PEER_ID=${peerContainer}`,
                    `CORE_PEER_ADDRESS=${peerContainer}:${peerPort}`,
                    `CORE_PEER_LISTENADDRESS=0.0.0.0:${peerPort}`,
                    `CORE_PEER_CHAINCODEADDRESS=${peerContainer}:${peerPort + 1}`,
                    `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${peerPort + 1}`,
                    `CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peerContainer}:${peerPort}`,
                    `CORE_PEER_LOCALMSPID=${org.orgName.toUpperCase()}MSP`
                ],
                working_dir: '/opt/gopath/src/github.com/hyperledger/fabric/peer',
                command: 'peer node start',
                volumes: [
                    '/var/run/:/host/var/run/',
                    `../crypto-config/peerOrganizations/${orgDomain}/peers/${peerContainer}/msp:/etc/hyperledger/fabric/msp`,
                    `../crypto-config/peerOrganizations/${orgDomain}/peers/${peerContainer}/tls:/etc/hyperledger/fabric/tls`,
                    `${peerContainer}:/var/hyperledger/production`
                ],
                ports: [
                    `${peerPort}:${peerPort}`
                ],
                networks: ['basic']
            };

            peerPort += 1000;

            if (i === 0 && i + 1 < org.nPeers) {
                dockerComposeObj.services[peerContainer].environment.push(`CORE_PEER_GOSSIP_BOOTSTRAP=peer${i + 1}.${orgDomain}:${peerPort}`);
            } else {
                if (i > 0) {
                    dockerComposeObj.services[peerContainer].environment.push(`CORE_PEER_GOSSIP_BOOTSTRAP=peer0.${orgDomain}:${anchorPeerPort}`);
                }
            }
        }
        caCount++;
        caPort += 1000;
    });

    fs.writeFileSync('docker-compose.yaml', yaml.stringify(dockerComposeObj));
};
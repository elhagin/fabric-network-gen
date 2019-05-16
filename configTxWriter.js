const fs = require('fs');
const yaml = require('yaml');

module.exports = function writeConfigTx(networkData, anchorPeers) {
    const orderer = networkData.orderer.charAt(0).toUpperCase() + networkData.orderer.slice(1);
    let configTxObj = {
        Organizations: [
            {
                [`&${orderer}Org`]: {
                    Name: `${orderer}Org`,
                    ID: `${orderer}MSP`,
                    MSPDir: `crypto-config/ordererOrganizations/${networkData.domainName}/msp`
                }
            }

        ]
    };


    configTxObj['Application'] = {
        Organizations: null
    };

    configTxObj['Orderer'] = {
        OrdererType: 'solo',
        Addresses: ['orderer.example.com:7050'],
        BatchTimeout: '15s',
        BatchSize:
        {
            MaxMessageCount: 30,
            AbsoluteMaxBytes: '297 MB',
            PreferredMaxBytes: '1536 KB'
        },
        Kafka: { Brokers: ['127.0.0.1:9092'] },
        Organizations: null
    }

    configTxObj['Profiles'] = {
        OrdererGenesis: {
            Orderer: {
                XX: '*OrdererDefaults',
                Organizations: ['*OrdererOrg']
            },
            Consortiums: {
                MyConsortium: {
                    Organizations: []
                }
            }
        },
        MyChannel: {
            Consortium: 'MyConsortium',
            Application: {
                XX: '*ApplicationDefaults',
                Organizations: []
            }
        }
    };

    networkData.orgs.forEach(org => {
        const orgDomain = `${org.orgName}.${networkData.domainName}`;
        const orgName = org.orgName.toUpperCase();
        configTxObj.Organizations.push({
            [`&${orgName}`]: {
                Name: `${orgName}MSP`,
                ID: `${orgName}MSP`,
                MSPDir: `crypto-config/peerOrganizations/${orgDomain}/msp`,
                AnchorPeers: [
                    {
                        Host: `peer0.${orgDomain}`,
                        Port: anchorPeers.get(orgName)
                    }
                ]
            }
        });
        configTxObj.Profiles.OrdererGenesis.Consortiums.MyConsortium.Organizations.push(`*${orgName}`);
        configTxObj.Profiles.MyChannel.Application.Organizations.push(`*${orgName}`);
    });

    let yamlConfigTx = yaml.stringify(configTxObj);
    yamlConfigTx = yamlConfigTx.replace(/"(.*)":?/g, '$1');
    yamlConfigTx = yamlConfigTx.replace(/XX/g, '<<');
    yamlConfigTx = yamlConfigTx.replace('Application:', 'Application: &ApplicationDefaults');
    yamlConfigTx = yamlConfigTx.replace('Orderer:', 'Orderer: &OrdererDefaults');
    fs.writeFileSync('configtx.yaml', yamlConfigTx);
    console.log("===================================================\nSuccessfully generated configtx file\n===================================================");
}

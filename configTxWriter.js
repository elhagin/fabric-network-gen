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
                    MSPDir: `crypto-config/ordererOrganizations/${networkData.domainName}/msp`,
                    Policies: {
                        Readers: {
                            Type: 'Signature',
                            Rule: `OR('${orderer}MSP.member')`
                        },
                        Writers: {
                            Type: 'Signature',
                            Rule: `OR('${orderer}MSP.member')`
                        },
                        Admins: {
                            Type: 'Signature',
                            Rule: `OR('${orderer}MSP.admin')`
                        }
                    }
                }
            }

        ]
    };

    configTxObj['Capabilities'] = {
        Channel: {
            V1_3: true
        },
        Orderer: {
            V1_1: true
        },
        Application: {
            V1_3: true,
            V1_2: false,
            V1_1: false
        }
    }

    configTxObj['Application'] = {
        Organizations: null,
        Policies: {
            Readers: {
                Type: 'ImplicitMeta',
                Rule: "ANY Readers"
            },
            Writers: {
                Type: 'ImplicitMeta',
                Rule: "ANY Writers"
            },
            Admins: {
                Type: 'ImplicitMeta',
                Rule: "MAJORITY Admins"
            }
        },
        Capabilities: {
            XX: "*ApplicationCapabilities"
        }
    };

    configTxObj['Orderer'] = {
        OrdererType: 'solo',
        Addresses: ['orderer.example.com:7050'],
        BatchTimeout: '15s',
        BatchSize:
        {
            MaxMessageCount: 30,
            AbsoluteMaxBytes: '99 MB',
            PreferredMaxBytes: '512 KB'
        },
        Kafka: { Brokers: ['127.0.0.1:9092'] },
        Organizations: null,
        Policies: {
            Readers: {
                Type: 'ImplicitMeta',
                Rule: "ANY Readers"
            },
            Writers: {
                Type: 'ImplicitMeta',
                Rule: "ANY Writers"
            },
            Admins: {
                Type: 'ImplicitMeta',
                Rule: "MAJORITY Admins"
            },
            BlockValidation: {
                Type: 'ImplicitMeta',
                Rule: "ANY Writers"
            }
        }
    }

    configTxObj['Channel'] = {
        Policies: {
            Readers: {
                Type: 'ImplicitMeta',
                Rule: "ANY Readers"
            },
            Writers: {
                Type: 'ImplicitMeta',
                Rule: "ANY Writers"
            },
            Admins: {
                Type: 'ImplicitMeta',
                Rule: "MAJORITY Admins"
            }
        },
        Capabilities: {
            XX: "*ChannelCapabilities"
        }
    }

    configTxObj['Profiles'] = {
        OrdererGenesis: {
            Orderer: {
                XX: '*OrdererDefaults',
                Organizations: [`*${orderer}Org`],
                Capabilities: {
                    XX: '*OrdererCapabilities'
                }
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
                Organizations: [],
                Capabilities: {
                    XX: '*ApplicationCapabilities'
                }
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
                Policies: {
                    Readers: {
                        Type: 'Signature',
                        Rule: `OR('${orgName}MSP.admin', '${orgName}MSP.peer', '${orgName}MSP.client')`
                    },
                    Writers: {
                        Type: 'Signature',
                        Rule: `OR('${orgName}MSP.admin', '${orgName}MSP.client')`
                    },
                    Admins: {
                        Type: 'Signature',
                        Rule: `OR('${orgName}MSP.admin')`
                    }
                },
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
    yamlConfigTx = yamlConfigTx.replace('Application:', 'Application: &ApplicationCapabilities');
    yamlConfigTx = yamlConfigTx.replace('Application:\n', 'Application: &ApplicationDefaults\n');
    yamlConfigTx = yamlConfigTx.replace('Orderer:', 'Orderer: &OrdererCapabilities');
    yamlConfigTx = yamlConfigTx.replace('Orderer:\n', 'Orderer: &OrdererDefaults\n');
    yamlConfigTx = yamlConfigTx.replace('Channel:', 'Channel: &ChannelCapabilities');
    yamlConfigTx = yamlConfigTx.replace('Channel:\n', 'Channel: &ChannelDefaults\n');
    fs.writeFileSync('configtx.yaml', yamlConfigTx);
    console.log("===================================================\nSuccessfully generated configtx file\n===================================================");
}

const fs = require('fs');
const yaml = require('yaml');

module.exports = function writeCryptoConfig(networkData) {
    const orderer = networkData.orderer.charAt(0).toUpperCase() + networkData.orderer.slice(1);

    cryptoConfigObj = {
        OrdererOrgs: [{
            Name: `${orderer}Org`,
            Domain: `${networkData.domainName}`,
            Specs: [{
                Hostname: `${orderer}`
            }]
        }],
        PeerOrgs: []
    };

    networkData.orgs.forEach(org => {
        const orgDomain = `${org.orgName}.${networkData.domainName}`;
        cryptoConfigObj.PeerOrgs.push({
            Name: `${org.orgName.toUpperCase()}`,
            Domain: `${orgDomain}`,
            EnableNodeOUs: true,
            Template: {
                Count: org.nPeers
            },
            Users: {
                Count: 1
            }
        });
    });

    let yamlCryptoConfig = yaml.stringify(cryptoConfigObj);
    yamlCryptoConfig = yamlCryptoConfig.replace(/"(.*)"/g, '$1');

    fs.writeFileSync('crypto-config.yaml', yamlCryptoConfig);
    console.log("===================================================\nSuccessfully generated crypto-config file\n===================================================");
}

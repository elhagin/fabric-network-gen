sudo rm -rf channel-artifacts 
sudo rm -rf crypto-config
docker rm -f $(docker ps -aq)
docker volume rm $(docker volume ls -q)
docker system prune -f
mkdir channel-artifacts
export FABRIC_CFG_PATH=$PWD
cryptogen generate --config=./crypto-config.yaml
export CURRENT_DIR=$PWD
cd crypto-config/peerOrganizations/cbe.ibm.com/ca/
export PRIV_KEY=$(ls *_sk)
cd "$CURRENT_DIR"
sed -i "s/CA1_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose.yaml
cd crypto-config/peerOrganizations/cib.ibm.com/ca/
export PRIV_KEY=$(ls *_sk)
cd "$CURRENT_DIR"
sed -i "s/CA2_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose.yaml
export FABRIC_CFG_PATH=$PWD
configtxgen -profile OrdererGenesis -outputBlock ./channel-artifacts/genesis.block
configtxgen -profile MyChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel
configtxgen -profile MyChannel -outputAnchorPeersUpdate ./channel-artifacts/CBEMSPanchors.tx -channelID mychannel -asOrg CBEMSP
configtxgen -profile MyChannel -outputAnchorPeersUpdate ./channel-artifacts/CIBMSPanchors.tx -channelID mychannel -asOrg CIBMSP
docker-compose up

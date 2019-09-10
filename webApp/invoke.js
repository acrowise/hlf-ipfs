'use strict';
const log4js = require('log4js');
const logger = log4js.getLogger('invoke');
logger.level = 'debug';
const util = require('util');

const serviceConfig = require('./services.json');

async function queryChaincodeStatus(username) {
  console.log('Querying Chaincode status with user: ', username);
  var fabricClient = require('./FabricClient');
  var connection = fabricClient;
  var fabricCAClient;
  await connection.initCredentialStores();
  fabricCAClient = connection.getCertificateAuthority();
  let user = await connection.getUserContext(username, true);
  if(user){
    return true;
  } else {
    return false;
  }
}

/*
Method: 
   queryChaincode
Description: 
   A method to query a chaincode for a given enrollment 
Params:
  - client: A successfully enrolled client
  - fcn: A function in the chaincode to be executed
  - args: Arguments associated with a function
Return: {
   success: <true | false>,
   payload: {
	    registrantID: registrant identity in string,
		registrantSecret: registrate password generated by CA
   },
   message: <string>
}
*/
module.exports.queryChaincode = async (client, fcn, args) => {

	console.log('Successfully got the fabric client for the organization "%s"', serviceConfig.blockchain.org);
	const channel = client.getChannel(serviceConfig.blockchain.channelName);
	if (!channel) {
		const message = util.format('Channel %s was not defined in the connection profile', serviceConfig.blockchain.channelName);
		return 	{
			success: false,
			payload: null,
			message: `Failed: ${message}`
		}
	}

	// send query
	const request = {
		targets: serviceConfig.blockchain.targets, //queryByChaincode allows for multiple targets
		chaincodeId: serviceConfig.blockchain.chaincodeName,
		fcn: fcn,
		args: args
	};

	try {
		let responsePayloads = await channel.queryByChaincode(request);
		if (responsePayloads) {

			let responseMessages = [];
			responsePayloads.forEach((payload)=>{
				const message = `query: ${args}
				 result: ${payload.toString('utf8')}`
				responseMessages.push(message);
			});

			console.log('-------->', responseMessages);

			return{
				success: true,
				payload: {
					responses: responseMessages
				},
				message: `Return Payload {
					responses: ${responseMessages}
				}`
			}
		} else {
			let message = 'Unable to fulfil query';
			console.log(message);
			return {
				success: false,
				payload: null,
				message: `Failed: ${message}`
			}
		}
	} catch (error) {
		const message = 'Failed to query due to error: ' + error.stack ? error.stack : error
		console.log(message);
		return {
			success: false,
			payload: null,
			message: `Failed: ${message}`
		};
	}
}

/*
Method: 
   proposeTransactionTransient
Description: 
   A method to send proposal to peers for a given enrollment 
Params:
  - client: A successfully enrolled client
  - fcn: A function in the chaincode to be executed
  - args: Arguments associated with a function
Return: {
   success: <true | false>,
   payload: {
	    registrantID: registrant identity in string,
		registrantSecret: registrate password generated by CA
   },
   message: <string>
}
*/
module.exports.proposeTransactionTransient = async (client, fcn, args) => {

	let request = {
		targets: serviceConfig.blockchain.targets,
		chaincodeId: serviceConfig.blockchain.chaincodeName,
		fcn: fcn,
		args: [],
		transientMap: args,
		chainId: serviceConfig.blockchain.channelName
	}

	let txIDString = null;

	const txId = client.newTransactionID();
	request.txId = txId;
	txIDString = txId.getTransactionID();
	const channel = client.getChannel(serviceConfig.blockchain.channelName);

	logger.debug('request.targets --->: ' + request.targets);
	logger.debug('request.chaincodeId --->: ' + request.chaincodeId);
	logger.debug('request.chainId --->: ' + request.chainId);
	logger.debug('request.txId --->: ' + request.txId);

	let results = null;

	try {
		results = await channel.sendTransactionProposal(request);
		logger.debug('result of proposal --->: ' + results);
	} catch (error) {
		return {
			success: false,
			payload: null,
			message: `Failed proposal: ${error.toString()}`
		};
	}

	let proposalResponses = results[0];
	let proposal = results[1];

	let all_good = true;
	for (var i in proposalResponses) {
		let one_good = false;
		if (proposalResponses && proposalResponses[i].response &&
			proposalResponses[i].response.status === 200) {
			one_good = true;
			logger.info('invoke chaincode proposal was good');
		} else {
			logger.error('invoke chaincode proposal was bad');
		}
		all_good = all_good & one_good;
	}

	if (all_good) {
		return {
			success: true,
			payload: {
				txId: txId,
				txIDString: txIDString,
				proposalResponses: proposalResponses,
				proposal: proposal
			},
			message: `Return payload {
				txID: ${txId}
				txIDString: ${txIDString},
				proposalResponses: ${proposalResponses},
				proposal: ${proposal}
			}`
		};
	} else {
		return {
			success: false,
			payload: null,
			message: "SendProposal: endorsement failure"
		};
	}
}

/*
Method: 
   proposeTransaction
Description: 
   A method to send proposal to peers for a given enrollment 
Params:
  - client: A successfully enrolled client
  - fcn: A function in the chaincode to be executed
  - args: Arguments associated with a function
Return: {
   success: <true | false>,
   payload: {
	    registrantID: registrant identity in string,
		registrantSecret: registrate password generated by CA
   },
   message: <string>
}
*/
module.exports.proposeTransaction = async (client, fcn, args) => {

	let request = {
		targets: serviceConfig.blockchain.targets,
		chaincodeId: serviceConfig.blockchain.chaincodeName,
		fcn: fcn,
		args: args,
		chainId: serviceConfig.blockchain.channelName
	}

	let txIDString = null;

	const txId = client.newTransactionID();
	request.txId = txId;
	txIDString = txId.getTransactionID();
	const channel = client.getChannel(serviceConfig.blockchain.channelName);

	logger.debug('request.targets --->: ' + request.targets);
	logger.debug('request.chaincodeId --->: ' + request.chaincodeId);
	logger.debug('request.chainId --->: ' + request.chainId);
	logger.debug('request.txId --->: ' + request.txId);

	let results = null;

	try {
		results = await channel.sendTransactionProposal(request);
		logger.debug('result of proposal --->: ' + results);
	} catch (error) {
		return {
			success: false,
			payload: null,
			message: `Failed proposal: ${error.toString()}`
		};
	}

	let proposalResponses = results[0];
	let proposal = results[1];

	let all_good = true;
	for (var i in proposalResponses) {
		let one_good = false;
		if (proposalResponses && proposalResponses[i].response &&
			proposalResponses[i].response.status === 200) {
			one_good = true;
			logger.info('invoke chaincode proposal was good');
		} else {
			logger.error('invoke chaincode proposal was bad');
		}
		all_good = all_good & one_good;
	}

	if (all_good) {
		return {
			success: true,
			payload: {
				txId: txId,
				txIDString: txIDString,
				proposalResponses: proposalResponses,
				proposal: proposal
			},
			message: `Return payload {
				txID: ${txId}
				txIDString: ${txIDString},
				proposalResponses: ${proposalResponses},
				proposal: ${proposal}
			}`
		};
	} else {
		return {
			success: false,
			payload: null,
			message: "SendProposal: endorsement failure"
		};
	}
}

/*
Method: 
   commitTransaction
Description: 
   A method to commit proposal to peers  
Params:
  - client: A successfully enrolled client
  - proposalResponses: responses from the transaction proposal
  - proposal: Content of the proposal
Return: {
   success: <true | false>,
   payload: {
	    commitStatus: status of response from orderer.,
   },
   message: <string>
}
*/
module.exports.commitTransaction = async (client, txId, proposalResponses, proposal) => {

	const ordererRequest = {
		txId: txId,
		proposalResponses: proposalResponses,
		proposal: proposal
	};

	const channel = client.getChannel(serviceConfig.blockchain.channelName);

	logger.info(util.format('------->>> send transactions : %O', ordererRequest));
	try {
		const result = await channel.sendTransaction(ordererRequest);
		if (result.status) {
			return {
				success: true,
				payload: {
					commitStatus: result.status,
				},
				message: `Return payload {
					commitStatus: ${result.status}
				}`
			};
		} else {
			return {
				success: true,
				payload: {
					commitStatus: result.status,
				},
				message: `Return payload {
					commitStatus: ${result.status}
				}`
			};
		}

	} catch (error) {
		return {
			success: false,
			payload: null,
			message: `Failed attachEventHub: ${error.toString()}`
		};
	}

}
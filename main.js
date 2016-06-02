var fs = require("fs");
var mysql = require('mysql');
var crypto = require('crypto');
var sys = require('sys')
var exec = require('child_process').exec;

//Read arguments to get args
var configuration = getConfigFile();

//If configurations read corrected, get IPs
if(configuration.processed) {
	getIps();
}



//Get configuration values from the command line arguments "-c <arg>"
function getConfigFile() 
{
	var config = new Config();
	for(var i=0; i < process.argv.length; i++) {
		//Get Configuration File
		if(process.argv[i] == '-c') {

			if(process.argv.lenght > i+1) {
				throwException("Error", "FATAL", "Please provide a configuration file after the -c");
			}

			i++;
			config.processed = true;
			config.configurationFile = process.argv[i];
			config.rawConfig = readConfigurationFile(config.configurationFile);
			if(typeof(config.rawConfig.phpipam) !== 'undefined') {
				config.phpipam = config.rawConfig.phpipam;
			}
			else {
				throwException("Config", "HIGH", "Could not find phpipam settings");
			}
		}
		//Display Help
		if(process.argv[i] == "-h" || process.argv[i] == "--help") {
			showHelp();
		}
		//Get Output File
		if(process.argv[i] == "-o") {
			if(process.argv.lenght > i+1) {
				throwException("Error", "FATAL", "Please provide an output file after -o");
			}
			i++;
			config.output = process.argv[i];
		}
		//Get Trigger File
		if(process.argv[i] == "-t") {
			if(process.argv.lenght > i+1) {
				throwException("Error", "FATAL", "Please provide an trigger file after -o");
			}
			i++;
			config.trigger = readTrigger(process.argv[i]);
			config.triggerOutput = process.argv[i];
		}
	}
	return config;
}

//Read the configuration file
function readConfigurationFile(fileName) {
	try {
		var content = fs.readFileSync(fileName);
		return JSON.parse(content);
	}
	catch(err) {
		throwException("Error", "FATAL", "Couldn't access configuration file");
	}

}

//Exception helper
function throwException(name, level, message) {
	throw { 
    	name: name, 
    	level: level, 
    	message: message, 
   		toString:    function(){return this.name + ": " + this.message;} 
	}; 
}

//Get IPs from database
function getIps() {
	var connection = connectToDb();
	connection.query('SELECT * from ipaddresses', function(err, rows, fields) {
  		if (!err) {
    		processIps(rows);
    	}
  		else {
    		throwException("Error", "HIGH", "Failed to read ip addresses");
    	}
	});

	connection.end();
}

//Connect to PHPIPAM Database
function connectToDb() {
	var connection = mysql.createConnection({
 		host     : configuration.phpipam.host,
  		user     : configuration.phpipam.username,
  		password : configuration.phpipam.password,
  		database : configuration.phpipam.database
	});

	connection.connect(function(err){
		if(err) {
    		throwException("Error", "HIGH", "Could not connect to database");   
		}
	});
	return connection;
}

//Show Help
function showHelp() {
	console.log("PHPIPAM-DHCP v1\nThis application will periodically copy hosts from PHPIPAM to ISC-DHCP-SERVER\n\narguments:\n-c <configuration file> (Required.)\n");
}

//Process all IPs found
function processIps(ips) {
	var output = "";
	for (var i = 0; i < ips.length; i++) {
		output += writeHostLine(ips[i]);
	};
	writeToOutputFile(output);
}

//Write a host line
function writeHostLine(hostRecord) {
	var hostLine = "host " + hostRecord.dns_name + " {\n";
	hostLine += "hardware ethernet " + convertMac(hostRecord.mac) + ";\n";
	hostLine += "fixed-address " + intToIP(hostRecord.ip_addr) + ";\n";
	hostLine += "}\n\n";
	return hostLine;
}

//Convert int IP value to string IP Address
function intToIP(int) {
    var part1 = int & 255;
    var part2 = ((int >> 8) & 255);
    var part3 = ((int >> 16) & 255);
    var part4 = ((int >> 24) & 255);

    return part4 + "." + part3 + "." + part2 + "." + part1;
}

//Write host lines to output file
function writeToOutputFile(output) {
	if(typeof(configuration.trigger) !== 'undefined') {
		var newHash = generateTriggerHash(output);
		if(newHash == configuration.trigger) {
			return;
		}
		else {
			fs.writeFile(configuration.output, output, function(err) {
		    	if(err) {
		        	throwException("Error", "FATAL", "Could not write out to output file: " + err);
		    	}
			});
			writeTrigger(newHash);
			restartDhcpServer();
		}
	}
	else {
		fs.writeFile(configuration.output, output, function(err) {
	    	if(err) {
	        	throwException("Error", "FATAL", "Could not write out to output file: " + err);
	    	}
		});
	}
}

//Convert the - mac values to : mac values that ISC understands
function convertMac(mac) {
	return mac.replace(/-/g, ":");
}

//Generate the MD5 hash for the output file
function generateTriggerHash(output) {
	return crypto.createHash('md5').update(output).digest("hex");
}

//Read in the MD5 hash file
function readTrigger(triggerFile) {
	try {
		var trigger = fs.readFileSync(triggerFile, 'utf8');
		return trigger;
	}
	catch(err) {
		return "";
	}
}

//Write the MD5 hash to the trigger file
function writeTrigger(hash) {
	fs.writeFile(configuration.triggerOutput, hash, function(err) {
	   if(err) {
	       throwException("Error", "FATAL", "Could not write out to trigger file: " + err);
	   }
	});
}

//Restart the DHCP server
function restartDhcpServer() {
	var restartCmd = exec("service isc-dhcp-server restart", 
		function (error, stdout, stderr) {
  			sys.print('stdout: ' + stdout);
  			sys.print('stderr: ' + stderr);
  			if (error !== null) {
    			console.log('exec error: ' + error);
  			}
		});
}


/* Objects */
function Config() {
	this.processed = false;
}






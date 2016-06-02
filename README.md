# PhpIpam-Isc
Node.JS Script to link PhpIPAM with ISC-DHCP-Server

This is my first node.js script so be kind

To use this script, edit the config.json file and add your PHPIPAM username, password, database host, and database name

Options:
* -c configurationFile
* -o outputFile
* -t triggerFile

To run the script issue this command
node main.js -c config.json -o output.hosts -t trigger.hash

The script will read the configuration file, connect to the MySQL database on the PHPIPAM host and pull all IP addresses. It will then generate a host file that ISC-DHCP-SERVER can understand. It will create an md5 file with the hosts hashed. It will then check the hash on each run to see if any changes have been made. If changes have been made, it will write the hosts to the file and restart the ISC server.

You can have ISC read the host file by including this line in your dhcp configuration file pointing to the program's ouput file:
include "/etc/dhcp/hosts";

Future changes:
* Add features to select which subnets and IPs to import.
* Default files instead of having to provide them on the commandline.
* Better command line read rather than the easy for loop.
* Support for other DHCP servers.

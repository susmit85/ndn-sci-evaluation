//Config
const config = require('./config.json');

//Includes
const mysql = require('mysql');

//Globals
const connection = mysql.createConnection(config.mysql);
const schema = ['activity', 'product', 'organization', 'model', 'experiment', 'frequency',
    'modeling_realm', 'variable_name', 'ensemble', 'time'];

//Tests



//TODO Path queries
//TODO Autocomplete queries



const env = 'production'

//insert your API Key & Secret for each environment, keep this file local and never push it to a public repo for security purposes.
const config = {
	production:{	
		APIKey : 'HTKFlqrNQySEYdvzHj-A4A',
		APISecret : 'nY4ctjhst7J3oLsbCYUnuMGoiJOcMiTQHCfS'
	}
};

module.exports = config[env]
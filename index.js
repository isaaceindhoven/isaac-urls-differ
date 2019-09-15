const compare = require('./lib/compare')
const create = require('./lib/profile-creator')
const logError = require('./lib/util').logError

const args = process.argv

if (args.length < 3) {
    logError(`Please provide profile name or a command.`)
    process.exit(1)
}

if (args[2] === '-c' || args[2] === '--create-profile' ) {
    if (args.length < 4) {
        logError(`Please provide the name of a profile to be created`)
        process.exit(1)
    }
    create(args[3]); 
    
} else if (args[2] === '-r' || args[2] === '--refresh-cache' ) {
    if (args.length < 4) {
        logError(`Please provide the name of a profile to use while refreshing`)
        process.exit(1)
    }
    compare(args[3], true);
} else {
    compare(args[2]);
}

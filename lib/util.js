const fs = require('fs')
const fsPromises = fs.promises

module.exports.createDirIfNotExists = async (name) => {
    try {
        await fsPromises.access(name)
    } catch (err) {
        try {
            await fsPromises.mkdir(name)
        } catch (err) {
            if (err.code !== 'EEXIST') {
                console.error(`Error: Cannot create dirctory: ${name}`, err)
                process.exit(1)
            }
        }
    } 
}

module.exports.doesDirExist = async (name) => {
    try {
        await fsPromises.access(name)
        return true
    } catch (err) {
        return false
    } 
}

module.exports.doesFileExist = async (file) => {
    try {
        await fsPromises.access(file, fs.constants.F_OK)
        return true
    } catch (err) {
        console.log(err)
        return false
    }
}

module.exports.cleanupDiff = (diff) => {
    return diff.map(curr => {
        const copy = [...curr]
        copy[1] = copy[1]
            .replace(/\r\n/g, '\n')
            .replace(/[\u202F\u00A0\u2000\u2001\u2003]/g, ' ')
        return copy
    })
}

module.exports.logError = (text, err) => {
    const lineLength = 80
    console.error('\n')
    console.error(`${'─'.repeat(lineLength / 2 - 4)} Error ${'─'.repeat(lineLength / 2 - 3)}`)
    console.error(text)
    if (err) {
        console.error('\n\n')
        console.error(err)
    }
    console.error('─'.repeat(lineLength))
    console.error('\n')
}
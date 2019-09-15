const md5 = require('md5')
const fs = require('fs').promises
const moment = require('moment')
const {createDirIfNotExists, logError} = require('./util')

const getMostRecentDateFolder = async (folder, folderDateFormat) => {
    const allFolderItems = await fs.readdir(folder, { withFileTypes: true })
    const subFolderNames = allFolderItems.filter(item => item.isDirectory()).map(item => item.name)
    if (subFolderNames.length === 0) return 
    return subFolderNames.reduce((prev, curr) => {
        const d = moment(curr, folderDateFormat)
        if (d.isValid()) {
            return prev === null || moment(prev, folderDateFormat) < d ? curr : prev
        }
    }, null)
}

module.exports.setEntry = async (url, html, cacheDirectory, folderDateFormat, executeTime) => {
    const htmlHash = md5(html)
    
    try {
        const urlFolder = `${cacheDirectory}/${md5(url)}`
        const datefolder = `${urlFolder}/${moment(executeTime).format(folderDateFormat)}`
        await createDirIfNotExists(cacheDirectory) // FIXME: this can conflict if two processes do it at the same time
        await createDirIfNotExists(urlFolder)
        await createDirIfNotExists(datefolder)
        await Promise.all([
            fs.writeFile(`${datefolder}/meta.json`, JSON.stringify({url, md5: htmlHash}), 'utf8'),
            fs.writeFile(`${datefolder}/content.html`, html, 'utf8')
        ])
        return { htmlHash, html }
    } catch (err) {
        logError(`  - Cannot store cache entry for ${url}`, err)
        process.exit(1)
    }
}

module.exports.getEntry = async (url, cacheDirectory, folderDateFormat) => {
    const urlFolder = `${cacheDirectory}/${md5(url)}`

    try {
        const dateFolder = await getMostRecentDateFolder(urlFolder, folderDateFormat)
        const metaFile = `${urlFolder}/${dateFolder}/meta.json`
        const htmlFile = `${urlFolder}/${dateFolder}/content.html`
        const [meta, html] = await Promise.all([
            fs.readFile(metaFile, 'utf8'),
            fs.readFile(htmlFile, 'utf8')
        ])
        
        return { htmlHash: JSON.parse(meta).md5, html }
    } catch (err) {
        if (err.code === 'ENOENT') {
            return 
        } else {
            logError('Error while reading cache', err)
            process.exit(1)
        }
    }
}

const moment = require('moment')
const compileReport = require('./report-compiler')
const getUrlSets = require('./urls-provider')
const saveReport = require('./report-saver')
const getRulesToIgnore = require('./ignore-provider')
const readConfig = require('./config')

const executeTime = new Date()

const compileReportOfNextUrl = async (urlSets, diffsToIgnore, state, config) => {
    const i = state.index++;
    const urlSet = urlSets[i]
    if (i < urlSets.length) {
        console.log(`Processing url ${i} of ${urlSets.length}`)
        const reportItem = await compileReport(urlSet, config.refreshCache, i, config.cacheDirectory, config.folderDateFormat, executeTime, diffsToIgnore)
        if (reportItem) {
            state.report.push(reportItem)
        }
        await compileReportOfNextUrl(urlSets, diffsToIgnore, state, config)
    }
}

module.exports = async (profileName, refreshCache = false) => {
    const startTime = moment()
    const state = { index: 0, report: [] }
    const config = await readConfig(profileName)
    config.refreshCache = refreshCache
    
    const [ urlSets, diffsToIgnore ] = await Promise.all([
        getUrlSets(config.urlsDirectory),
        getRulesToIgnore(config.ignoreDirectory)
    ])

    await Promise.all([...Array(config.nrOfParallelRequests)].map(i=>compileReportOfNextUrl(urlSets, diffsToIgnore, state, config)))
    
    if (state.report.length > 0) {
        const reportName = await saveReport(state.report, config.reportDirectory, config.folderDateFormat, config.snippetContextSize, executeTime)
        console.log(`\n😱  OMG, found ${state.report.length} url(s) with issues. See more info in '${reportName}'.`)
    } else {
        console.log('\n👍  Nice, no changes found in any of the urls.')
    }

    const totalTime = moment.duration(moment().diff(startTime)).asSeconds()
    console.log(`\n⏱️  Finished in ${totalTime} seconds\n`)
}
const md5 = require('md5')
const beautify = require('js-beautify').html
const axios = require('axios')
const https = require('https');
const sleep = require('util').promisify(setTimeout)
const cache = require('./cache')
const differ = require('./differ')

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    })
});

const fetchUrlWithRetry = async (url, index, config, attempt = 1, nrOf404s = 0, nrOfNon404Errors = 0) => {
    const { maxNrOf404ErrorsInAttempts, maxNrOfNon404ErrorsInAttempts} = config
    try {
        const response = await axiosInstance.get(url)
        return beautify(response.data, { indent_size: 2, space_in_empty_paren: true, max_preserve_newlines: 0, preserve_newlines: false })
    } catch (err) {
        const is404 = err.response && err.response.status === 404
        let errMsg = `Error on fetch, sleeping for ${attempt} seconds. This was attempt ${attempt} for ${url}`
        if (is404) {
            if ((nrOf404s + 1) === maxNrOf404ErrorsInAttempts) {
                console.log(`    ○ ${index} - 404 encountered. Marking it as failed, since the maximum number of 404s have been reached for ${url}`)
                return { status: 'error', errorStatus: '404' }
            }
            errMsg = `404 encountered. Sleeping for ${attempt} second(s). This was attempt ${nrOf404s + 1} of a max of ${maxNrOf404ErrorsInAttempts} 404s for ${url}`
        } 
        if (!is404) {
            const errorStatus = err.response && err.response.status ? err.response.status : 'unknow error';
            if ((nrOfNon404Errors + 1) === maxNrOfNon404ErrorsInAttempts) {
                console.log(`    ○ ${index} - ${errorStatus} encountered. Marking it as failed, since the maximum number of non-404 errors have been reached for ${url}`)
                return { status: 'error', errorStatus: errorStatus }
            }
            errMsg = `${errorStatus} encountered. Sleeping for ${attempt} second(s). This was attempt ${nrOfNon404Errors + 1} of a max of ${maxNrOfNon404ErrorsInAttempts} non-404 errors for ${url}`
        } 
        console.log(`    ○ ${index} - ${errMsg}`)
        await sleep(1000 * attempt)
        return await fetchUrlWithRetry(url, index, config, attempt + 1, nrOf404s + (is404 ? 1 : 0), nrOfNon404Errors + (is404 ? 0 : 1))
    }
}

const createErrorReport = (urlSet, fetchedUrl, index, errorStatus) => {
    return { 
        issue: 'error',
        errorStatus: errorStatus,
        urlSet, 
        cachedUrlHash: md5(urlSet.oldUrl),
        fetchedUrl,
    }
}


module.exports = async (urlSet, index, executeTime, diffsToIgnore, config) => {
    const { refreshCache, cacheDirectory, folderDateFormat } = config;

    // First get the cached value. If needed create the cache first
    let cachedEntry = await cache.getEntry(urlSet.oldUrl, cacheDirectory, folderDateFormat)
    if (!cachedEntry || refreshCache) {
        const oldHtml = await fetchUrlWithRetry(urlSet.oldUrl, index, config)
        if (oldHtml.status === 'error') { 
            return createErrorReport(urlSet, urlSet.oldUrl, index, oldHtml.errorStatus)
        }
        cachedEntry = await cache.setEntry(urlSet.oldUrl, oldHtml, cacheDirectory, folderDateFormat, executeTime)
        if (urlSet.oldUrl === urlSet.newUrl) return
    } 

    // Now get the latest HTML
    const newHtml = await fetchUrlWithRetry(urlSet.newUrl, index, config)
    if (newHtml === '404') {
        return createErrorReport(urlSet, urlSet.newUrl, index)
    }

    // Now do a quick check if there is are differences
    if (cachedEntry.htmlHash === md5(newHtml)) return

    // Now do a thorough check to see if these differences are relevant
    const diff = differ(cachedEntry.html, newHtml, diffsToIgnore)
    if (!diff) return
    
    // The diffs are relevant, so now return the diff report 
    console.log(`    ○ ${index} - ${diff.metadata.total} changes (+${diff.metadata.add} / -${diff.metadata.del}) found for ${urlSet.newUrl}`)

    return { 
        issue: 'diff',
        urlSet, 
        cachedUrlHash: md5(urlSet.oldUrl),
        html: newHtml,
        cachedHtml: cachedEntry.html,
        diff,
    }
}
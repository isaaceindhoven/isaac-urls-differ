const md5 = require('md5')
const beautify = require('js-beautify').html
const axios = require('axios')
const https = require('https');
const sleep = require('util').promisify(setTimeout)
const cache = require('./cache')
const differ = require('./differ')

const maxnrOf404sInAttempts = 4

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    })
});

const fetchUrlWithRetry = async (url, index, attempt = 1, nrOf404s = 0) => {
    try {
        const response = await axiosInstance.get(url)
        return beautify(response.data, { indent_size: 2, space_in_empty_paren: true, max_preserve_newlines: 0, preserve_newlines: false })
    } catch (err) {
        const is404 = err.response && err.response.status === 404
        let errMsg = `Error on fetch, sleeping for ${attempt} seconds. This was attempt ${attempt} for ${url}`
        if (is404) {
            if ((nrOf404s + 1) === maxnrOf404sInAttempts) {
                console.log(`    ○ ${index} - 404 encountered. Marking it as failed, since the maximum number of 404s have been reached for ${url}`)
                return '404'
            }
            errMsg = `404 encountered. Sleeping for ${attempt} second(s). This was attempt ${nrOf404s + 1} of a max of ${maxnrOf404sInAttempts} 404s for ${url}`
        } 
        console.log(`    ○ ${index} - ${errMsg}`)
        await sleep(1000 * attempt)
        return await fetchUrlWithRetry(url, index, attempt + 1, nrOf404s + (is404 ? 1 : 0))
    }
}

const create404Report = (urlSet, fetchedUrl, index) => {
    return { 
        issue: '404',
        urlSet, 
        cachedUrlHash: md5(urlSet.oldUrl),
        fetchedUrl,
    }
}

module.exports = async (urlSet, refreshCache, index, cacheDirectory, folderDateFormat, executeTime, diffsToIgnore) => {
    // First get the cached value. If needed create the cache first
    let cachedEntry = await cache.getEntry(urlSet.oldUrl, cacheDirectory, folderDateFormat)
    if (!cachedEntry || refreshCache) {
        const oldHtml = await fetchUrlWithRetry(urlSet.oldUrl, index)
        if (oldHtml === '404') { 
            return create404Report(urlSet, urlSet.oldUrl, index)
        }
        cachedEntry = await cache.setEntry(urlSet.oldUrl, oldHtml, cacheDirectory, folderDateFormat, executeTime)
        if (urlSet.oldUrl === urlSet.newUrl) return
    } 

    // Now get the latest HTML
    const newHtml = await fetchUrlWithRetry(urlSet.newUrl, index)
    if (newHtml === '404') {
        return create404Report(urlSet, urlSet.newUrl, index)
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
# URL comparison

## Requirements

1. At least node.js version 10.x

## What does this do?

Fetch URLs and compare the content with local cached copies. See the differences in a nicely formatted report.

Only the page's content is compared, it does include referenced files in the comparisson. For example: if the URL returns HTML then only the HTML itself is compated, not the CSS, JavaScript, images, etc.

The differences will be nicely formatted in a report on disk. Minor differences like whitespace and formatting will be ignored. Additionally, you can specify which differences need to be ignored.

URLs can either be compared to themselves or to other URLs. Comparing a URL to a cached copy of itself allows you to check if a page has changed over time. This is useful when refactoring a live site to see if it is still up and is showing the same html. Comparing a URL to another URL is useful when migrating sites, since this allows you to see if a migrated page is the same as the original.

You can define multiple sets of URLs, called profiles. When running the tool, you'll need to specify which profile you'd like to use. Each profile has its own cache, ignore rules and stored reports.

You can update the local cache of a profile to the live version at any time. Older caches are not deleted, but only the latest cache is used for comparing.

To speed things up, fetching of the URLs is parallelized using 8 different threads by default. Make sure that the server can handle this load. If not reduce the number of threads by changing the `nrOfParallelRequests` setting in the config.json file of a profile.

## How to run

Create a new profile with name `profileName`. The folder will be created in the `/profiles` folder.
```
node index -c profileName
```

Running a comparison using profile `profileName`.
```
node index profileName
```

Running a comparison using profile `profileName` and refreshing its cache.
```
node index -r profileName
```

## Defining URL lists
The comparison will use all URLs defined in all files in a profile's `urls` folder. All files in that folder must be valid URL definition files. A valid file is a json file that contains an array `[...]` of URL definitions.

There are two types of URL definitions:

### Comparing a URL to itself
To compare a URL to itself simply define it as a string in the json file.
```
[
    "https://some.domain.com/some/path",
    "https://some.domain.com/some/other/path"
]
```

### Comparing a URL to different URL
To do this define a JSON object with the original URL as the value of property `oldUrl` and the new URL as the value of `newUrl`.
```
[
    {
        "oldUrl": "http://some.domain/some/path",
        "newUrl": "https://some.domain/some/other/path"
    },
    {
        "oldUrl": "https://some.domain/some/path2",
        "newUrl": "http://some.other.domain/some/path2"
    }
]
```

You can mix the two types of URL definition in one file if needed:
```
[
    "https://some.domain.com/some/path",
    {
        "oldUrl": "https://some.domain/some/path2",
        "newUrl": "https://some.other.domain/some/path2"
    }
]
```

## The local cache

To be able to do the comparison we need to cache the last known value of the page on a URL. This cache is stored in a profile's `cache` folder. The folder name is the md5 hash of the URL itself.

That folder contains a list of date folders: one for each time you requested the URL cache to be refreshed. The date folder has the date and time of the moment the refresh was executed. All URL folders have the same date and time folders unless a refresh was cancelled during execution. In that case only the folders of the urls that had already been fetched before the cancellation will have the new date folders.

In each date folder you'll find a metadata file that contains the URL that was fetched and an md5 hash of the page's content that was returned at that time. The folder also contains a reformatted version of the fetched html page. 

You can completely delete a profile's cache folder. The next time the comparison for that profile is run a new cache will be created automatically.

## The report file

When differences are found during a comparison the system will create a new report.html file in the profile's `report` folder. You can open the html file in a browser to see the differences per URL.

If the report file is very large it can take a long time to open the file in a browser. In such a case it's often a good idea to first only add a limited number of URLs to the `urls` folder. Then run the comparison and open the resulting smaller report file. Add all irrelevant differences to a file in the `ignore` folder and run the comparison again with all URLs. The resulting file will be much smaller since all irrelevant differences that occurred on all pages are now omitted from the report file.

## Ignoring differences

Some differences are not relevant and should be ignored. This is managed through the files in the profile's `ignore` folder.

The format that is used in these files is an internal representation and is tricky to manually edit. That is why the generated report file has tooling to facilitate the creation of a list of differences to ignore.

To use it open the report.html file in a browser and select the text that contains the irrelevant differences. Next click on the `Add selected diffs to list` button. After having added all differences that you want to ignore click on the `Show list` button and copy the list to the clipboard. Paste it to a file and save that in the `ignore` folder of the used profile. The next time the comparison is run these differences will no longer be shown in the report. 

Make sure the files in the `ignore` folder all contain valid json. All rules must be inside a json array. For instance:
```
[
    [-1, ""],
    [1, ""],
    [1, " "]
]
```

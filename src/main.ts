import axios from "axios"
import cloudscraper from "cloudscraper"
import XRegExp from "xregexp"
import fs from "fs"
import path from "path"

interface ChapterEntry {
    chap: number
    uri: string
    label: string
}

interface ImageEntry {
    index: number
    original: string
    cdn: string
}

const http = axios.create({
    baseURL: "https://www.nettruyenme.com",
    withCredentials: false,
    headers: {
        "Referer": "https://www.nettruyenme.com"
    }
})

let arrayChapter = new Array<ChapterEntry>()

const listChapterRequest = (url: string): Promise<Array<ChapterEntry>> => {
    return new Promise(async (resolve, reject) => {
        cloudscraper({
            method: "GET",
            url: url
        }).then((source: string) => {
            source = source.replace(/[\r\n]+/g," ")
                           .replace("'", "\"")

            const listRegex = /<div class="list-chapter" id="nt_listchapter">.+?<nav>.*?<ul>(.+?)<\/ul>/g
            const entryRegex = /<li class="row.+?<a href="(.+?)" data-id="\d+">Chapter\s+([0-9.]+):?\s*-?\s*(.*?)<\/a>.+?<\/li>/g
            const [ , list ] = listRegex.exec(source) || ["", ""]
            const chapters = new Array<ChapterEntry>();

            XRegExp.forEach(list, entryRegex, ([ , uri, chap, label ]) =>
                chapters.push({ chap: Number.parseInt(chap), uri: uri, label: label }))

            if (typeof chapters.length === "undefined" || chapters.length <= 0)
                reject(new Error("Not found list chapter in url " + url))
            else
                resolve(chapters)
        }).catch((err: Error) => console.error(err))
    })
}

const listImageRequest = (chapter: ChapterEntry): Promise<Array<ImageEntry>> => {
    return new Promise(async (resolve, reject) => {
        cloudscraper({
            method: "GET",
            url: chapter.uri
        }).then((source: string) => {
            source = source.replace(/[\r\n]+/g," ")
                           .replace(/[']+/g, "\"")

            const listRegex = /<div class="reading-detail box_doc">(.+?)<div class="container">/g
            const imgRegex = /<div id="page.+?<img.+?data-original="(.+?)"\s+data-cdn="(.+?)"/g
            const [, list] = listRegex.exec(source) || [ "", "" ]
            const images = new Array<ImageEntry>();

            XRegExp.forEach(list, imgRegex, ([ , original, cdn ], index) =>
                images.push({ index: index, original: original, cdn: cdn }))

            if (typeof images.length === "undefined" || images.length <= 0)
                reject(new Error("Not found list image in chapter: " + chapter.uri))
            else
                resolve(images)
        }).catch((err: Error) => console.error(err))
    })
}

// listChapterRequest("https://www.nettruyenme.com/truyen-tranh/toi-da-chuyen-sinh-thanh-slime-100620")
listChapterRequest("https://www.nettruyenme.com/truyen-tranh/vi-so-dau-nen-em-tang-max-vit-193640")
    .then(chapters => {
        console.log("Chapter request list success")
        listImageRequest(chapters[0])
            .then(images => {
                const url = "https:" + images[0].original
                console.log("Download image: " + url)
                http.get(url, { responseType: "stream" }).then(res => {
                    res.data.pipe(fs.createWriteStream("./001.jpg"))
                            .on("error", console.error)
                            .once("close", () => console.log("Successful download image"))
                }).catch(err => console.error(err))
            })
    }).catch(err => console.log(err))

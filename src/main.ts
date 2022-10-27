import axios, { AxiosResponse } from "axios"
import cloudscraper from "cloudscraper"
import XRegExp from "xregexp"
import fs from "fs"
import path from "path"

interface Comic {
    seo: string
    writer: string
    inker: string
    title: string
    thumb: string
    genre: Array<string>
    chapters: Array<ChapterEntry>
}

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

const urlScheme = (url: string): string => {
    if (!url.startsWith("http")) {
        if (url.startsWith("//"))
            return "http:" + url
        else
            return "http://" + url
    }

    return url
}

const urlFilename = (url: string): string => {
    const filename = url.split('/')?.pop()?.split('#')[0].split('?')[0]
    return (typeof filename === "undefined" ? "" : filename)
}

const listChapterRequest = (url: string): Promise<Comic> => {
    return new Promise(async (resolve, reject) => {
        cloudscraper({
            method: "GET",
            url: url
        }).then((source: string) => {
            source = source.replace(/[\r\n]+/g," ")
                           .replace("'", "\"")

            const titleRegex  = /<h1 class="title-detail">(.+?)<\/h1>/g
            const thumbRegex  = /<div class="detail-info">.+?<div class="col-xs-4 col-image">.+?src="(.+?)".+?<\/div>/
            const infoRegex   = /<div class="detail-info">.+?<ul class="list-info">(.+?)<\/ul>/g
            const listRegex   = /<div class="list-chapter" id="nt_listchapter">.+?<nav>.*?<ul>(.+?)<\/ul>/g
            const entryRegex  = /<li class="row.+?<a href="(.+?)" data-id="\d+">Chapter\s+([0-9.]+):?\s*-?\s*(.*?)<\/a>.+?<\/li>/g
            const [ , title ] = titleRegex.exec(source) || ["", ""]
            const [ , thumb ] = thumbRegex.exec(source) || ["", ""]
            const [ , info ]  = infoRegex.exec(source)  || ["", ""]
            const [ , list ]  = listRegex.exec(source)  || ["", ""]
            const chapters    = new Array<ChapterEntry>()
            const genre       = new Array<string>()

            const [ , author ] = /<li class="author.+?<p class="col-xs-8">(.+?)<\/p>/g.exec(info) || ["", ""]
            const [ , status ] = /<li class="status.+?<p class="col-xs-8">(.+?)<\/p>/g.exec(info) || ["", ""]
            const [ , kind ]   = /<li class="kind.+?<p class="col-xs-8">(.+?)<\/p>/g.exec(info)   || ["", ""]
            const [ , seo ]    = /\/([a-zA-Z0-9\-\_\.]+)(-\d*)$/gi.exec(url)                      || ["", ""]

            XRegExp.forEach(kind, /<a href=.+?>(.+?)<\/a>/g, ([ , value ]) =>
                genre.push(value))

            XRegExp.forEach(list, entryRegex, ([ , uri, chap, label ]) =>
                chapters.push({ chap: Number.parseFloat(chap), uri: uri, label: label }))

            if (typeof chapters.length === "undefined" || chapters.length <= 0) {
                reject(new Error("Not found list chapter in url " + url))
            } else {
                resolve({
                    title: title, thumb: urlScheme(thumb), writer: author,
                    inker: author, genre: genre, chapters: chapters, seo: seo
                })
            }
        }).catch((err: Error) => console.error(err))
    })
}

const listImageRequest = (comic: Comic, chapter: ChapterEntry): Promise<Array<ImageEntry>> => {
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
            const images = new Array<ImageEntry>()

            XRegExp.forEach(list, imgRegex, ([ , original, cdn ], index) =>
                images.push({ index: index, original: urlScheme(original), cdn: urlScheme(cdn) }))

            if (typeof images.length === "undefined" || images.length <= 0)
                reject(new Error("Not found list image in chapter: " + chapter.uri))
            else if (!storageMaker(comic, chapter))
                reject(new Error("Storage maker chap failed: " + chapter.chap))
            else
                resolve(images)
        }).catch((err: Error) => console.error(err))
    })
}

const chapName = (chapter: ChapterEntry): string => {
    const prefix = "Chapter "
    const labelSub = " - "

    if (chapter.label.length <= 0)
        return prefix + chapter.chap

    return prefix + chapter.chap + labelSub + chapter.label
}

const storagePath = (comic: Comic, chapter: ChapterEntry): string =>
    path.join(path.dirname(__dirname), "storage", comic.seo, chapName(chapter))

const storageMaker = (comic: Comic, chapter: ChapterEntry): boolean => {
    const chapPath = storagePath(comic, chapter)

    if (!fs.existsSync(chapPath) && typeof fs.mkdirSync(chapPath, { recursive: true }) === "undefined")
        return false

    return true
}

const downloadImage = (comic: Comic, chapter: ChapterEntry, image: ImageEntry): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        http.get(image.original, { responseType: "stream" })
            .then(async res => resolve(await writeImage(comic, chapter, image.original, image, res)))
            .catch(err => {
                if (err.response && err.response.status != 200) {
                    http.get(image.cdn, { responseType: "stream" })
                        .then(async res => resolve(await writeImage(comic, chapter, image.cdn, image, res)))
                        .catch(err => reject(err))
                } else {
                    reject(err)
                }
            })
    })
}

const writeImage = (comic: Comic, chapter: ChapterEntry, url: string, image: ImageEntry, res: AxiosResponse): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const nameRegex = /(\d+)[a-zA-Z0-9-_]*(.jpg|.jpeg|.png|.bmp|.webp)(\?.+?)*/gi
        const [ , num, format ] = nameRegex.exec(urlFilename(url)) || ["", "", ""]
        const filepath = path.join(storagePath(comic, chapter), num + format)

        res.data.pipe(fs.createWriteStream(filepath))
                .on("error", () => reject(new Error("Write image failed: " + filepath)))
                .once("close", () => resolve(true))
    })
}

const url = "https://www.nettruyenin.com/truyen-tranh/vi-so-dau-nen-em-tang-max-vit-19364"
// const url = "https://www.nettruyenme.com/truyen-tranh/toi-da-chuyen-sinh-thanh-slime-100620"

listChapterRequest(url)
    .then(async comic => {
        console.log("Mange detail =>", {
            Title: comic.title,
            Author: comic.writer,
            SEO: comic.seo,
            Genre: comic.genre
        })

        let chapter
        for (let i = 0; i < comic.chapters.length; ++i) {
            chapter = comic.chapters[i]

            console.log("Request list image chap:", chapter.chap)
            const images = await listImageRequest(comic, chapter)

            for (let k = 0; k < images.length; ++k) {
                console.log("Chap", chapter.chap, "download image:", images[k].original)
                await downloadImage(comic, chapter, images[k])
            }
        }
    }).catch(err => console.log(err))

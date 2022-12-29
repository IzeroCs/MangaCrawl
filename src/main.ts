import axios, { AxiosResponse } from "axios"
import cloudscraper from "cloudscraper"
import XRegExp from "xregexp"
import xmlbuilder, { stringWriter } from "xmlbuilder"
import fs from "fs"
import path, { resolve } from "path"
import colors from "colors"

const AUTHOR_STATUS_UPDATING = "Đang cập nhật"
const COMIC_STATUS_COMPLETED = "Hoàn thành"
const COMIC_STATUS_ONGOING = "Đang tiến hành"

interface Comic {
    seo: string
    author: string
    writer: string
    penciller: string
    inker: string
    title: string
    description: string
    thumb: string
    status: number
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
    original: string,
    page: number
}

const fileListPath = path.resolve(__dirname, "..", "list.json")
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
            const entryRegex  = /<li class="row.+?<a href="(.+?)" data-id="\d+">Chapter\s+([0-9.]+):?\s*-?\s*(.*?)\.?<\/a>.+?<\/li>/g
            const [ , title ] = titleRegex.exec(source) || ["", ""]
            const [ , thumb ] = thumbRegex.exec(source) || ["", ""]
            const [ , info ]  = infoRegex.exec(source)  || ["", ""]
            const [ , list ]  = listRegex.exec(source)  || ["", ""]
            const chapters    = new Array<ChapterEntry>()
            const genre       = new Array<string>()

            const [ , author ] = /<li class="author.+?<p class="col-xs-8">(.+?)<\/p>/g.exec(info) || ["", ""]
            const [ , status ] = /<li class="status.+?<p class="col-xs-8">(.+?)<\/p>/g.exec(info) || ["", ""]
            const [ , kind ]   = /<li class="kind.+?<p class="col-xs-8">(.+?)<\/p>/g.exec(info)   || ["", ""]
            const [ , desc ]   = /<div class="detail-content"><p.+?>(.+?)<\/p>/g.exec(source)     || ["", ""]
            const [ , seo ]    = /\/([a-zA-Z0-9\-\_\.]+)(-\d*)$/gi.exec(url)                      || ["", ""]

            XRegExp.forEach(kind, /<a href=.+?>(.+?)<\/a>/g, ([ , value ]) =>
                genre.push(value))

            XRegExp.forEach(list, entryRegex, ([ , uri, chap, label ]) =>
                chapters.push({ chap: Number.parseFloat(chap), uri: uri, label: label }))

            genre.sort((a: string, b: string) => (a > b ? 1 : -1))
            chapters.sort((a: ChapterEntry, b: ChapterEntry) => (a.chap > b.chap ? 1 : -1))

            if (typeof chapters.length === "undefined" || chapters.length <= 0) {
                reject(new Error("Not found list chapter in url " + url))
            } else {
                let authorValue = author.replace(/<a href=.+?>(.+?)<\/a>/gi, "$1")
                let statusValue = 0

                if (author == AUTHOR_STATUS_UPDATING)
                    authorValue = ""

                if (status == COMIC_STATUS_ONGOING)
                    statusValue = 1
                else if (status == COMIC_STATUS_COMPLETED)
                    statusValue = 2

                resolve({
                    title: title, thumb: urlScheme(thumb), author: authorValue, writer: authorValue, penciller: authorValue,
                    inker: authorValue, genre: genre, chapters: chapters, seo: seo, status: statusValue, description: desc
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
            const imgRegex = /<div id="page.+?<img.+?data-index="(\d+)".+?data-original="(.+?)"/g
            const [, list] = listRegex.exec(source) || [ "", "" ]
            const images = new Array<ImageEntry>()

            XRegExp.forEach(list, imgRegex, ([ , page, original ], index) => {
                if (!original.endsWith("638047952612608555.jpg"))
                    images.push({ index: index, original: urlScheme(original), page: parseInt(page) })
            })

            if (typeof images.length === "undefined" || images.length <= 0)
                reject(new Error("Not found list image in chapter: " + chapter.uri))
            else if (!storageChapMaker(comic, chapter))
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

    return prefix + chapter.chap
}

const storagePath = (comic: Comic): string =>
    path.join(path.dirname(__dirname), "storage", comic.seo)

const storageChapPath = (comic: Comic, chapter: ChapterEntry): string =>
    path.join(storagePath(comic), chapName(chapter))

const storageMaker = (comic: Comic): boolean => {
    const stPath = storagePath(comic)

    if (!fs.existsSync(stPath) && typeof fs.mkdirSync(stPath, { recursive: true }) === "undefined")
        return false

    return true
}

const storageChapMaker = (comic: Comic, chapter: ChapterEntry): boolean => {
    const chapPath = storageChapPath(comic, chapter)

    if (!fs.existsSync(chapPath) && typeof fs.mkdirSync(chapPath, { recursive: true }) === "undefined")
        return false

    return true
}

const downloadImage = (comic: Comic, chapter: ChapterEntry, image: ImageEntry): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        http.get(image.original, { responseType: "stream" })
            .then(async res => resolve(await writeImage(comic, chapter, image.original, image, res)))
            .catch(err => reject(err))
    })
}

const writeImage = (comic: Comic, chapter: ChapterEntry, url: string, image: ImageEntry, res: AxiosResponse): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const formatRegex = /\/.+?(.jpg|.jpeg|.png|.bmp|.webp).*?$/gi
        const [, format ] = formatRegex.exec(url) || ["", ""]
        let num = image.page.toString();

        if (num.length <= 1)
            num = `00${num}`
        else if (num.length <= 2)
            num = `0${num}`

        const filepath = path.join(storageChapPath(comic, chapter), num + format)

        res.data.pipe(fs.createWriteStream(filepath))
                .on("error", () => reject(new Error("Write image failed: " + filepath)))
                .once("close", () => resolve(true))
    })
}

const writeCover = (comic: Comic): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const filepath = path.join(storagePath(comic), "cover.jpg")

        if (typeof comic.thumb === "undefined")
            resolve(true)

        http.get(comic.thumb, { responseType: "stream" })
            .then(async res => {
                res.data.pipe(fs.createWriteStream(filepath))
                        .on("error", () => reject(new Error("Write thumb failed: " + filepath)))
                        .once("close", () => resolve(true))
            }).catch(err => {
                reject(err)
            })
    })
}

const writeDetail = (comic: Comic): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const filepath = path.join(storagePath(comic), "details.json")
        const detail = {
            title: comic.title,
            author: comic.author,
            artist: comic.author,
            description: comic.description,
            genre: comic.genre.join(", "),
            status: comic.status
        }

        if (!storageMaker(comic))
            reject(new Error("Storage maker failed: " + storagePath(comic)))

        try {
            fs.writeFileSync(filepath, JSON.stringify(detail, null, 2))
            resolve(true)
        } catch (e) {
            reject(new Error("Write detail failed: " + filepath))
        }
    })
}

const writeComicInfo = (comic: Comic, chapter: ChapterEntry): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const filepath = path.join(storageChapPath(comic, chapter), "ComicInfo.xml")
        const xml = xmlbuilder.create("ComicInfo")
            .ele({
                Series: "",
                Number: chapter.chap,
                Writer: comic.writer,
                Penciller: comic.penciller,
                Inker: comic.inker,
                Title: chapName(chapter),
                Summary: {},
                Genre: comic.genre.join(", ")
            }).end({
                pretty: true, newline: "\n", indent: "  "
            })

        try {
            fs.writeFileSync(filepath, xml, { encoding: "utf8" })
            resolve(true)
        } catch (e) {
            reject(new Error("Writer ComicInfo failed: " + filepath))
        }
    })
}

const writeJsonList = (list: Array<ItemList>): Promise<Boolean> => {
    return new Promise((resolve, reject) => {
        fs.writeFile(fileListPath,
            JSON.stringify(list, null, 2), () => resolve(true))
    })
}

const requestList = async (array: Array<ItemList>) => {
    let list = [...array]

    for (let i = 0; i < list.length; ++i) {
        let item = list[i]

        console.log(colors.blue("Name: ") + colors.cyan(item.title))
        console.log(colors.blue("Request: ") + colors.cyan("/" + item.url))

        if (typeof item.ignore !== "undefined" && item.ignore === true) {
            console.log(colors.blue("Status: ") + colors.grey("Ignore manga request"))
        } else {
            const comic = await listChapterRequest(baseURL + "/" + item.url)

            if (typeof comic !== "undefined") {
                console.log(colors.blue("Status: ") + colors.cyan("WriteDetail"))
                await writeDetail(comic)
                console.log(colors.blue("Status: ") + colors.cyan("WriteCover"))
                await writeCover(comic)

                let chapter
                let hasChapterNew = false

                for (let j = 0; j < comic.chapters.length; ++j) {
                    chapter = comic.chapters[j]

                    if (chapter.chap > item.chap) {
                        let logRequestStr = colors.blue("Status: ") +
                            colors.green("Request list image chap ") + colors.magenta.bold(chapter.chap.toString()) +
                            colors.cyan("/") + colors.red.bold(comic.chapters[comic.chapters.length - 1].chap.toString()) +
                            colors.cyan(" => ") + colors.yellow.bold("$current") +
                            colors.cyan("/") + colors.red.bold("$total") + colors.cyan(" images")

                        process.stdout.write(logRequestStr.replace("$current", "0").replace("$total", "0"))
                        const images = await listImageRequest(comic, chapter)

                        logRequestStr = logRequestStr.replace("$total", images.length.toString())
                        hasChapterNew = true
                        await writeComicInfo(comic, chapter)

                        for (let k = 0; k < images.length; ++k) {
                            await downloadImage(comic, chapter, images[k])
                            process.stdout.clearLine(0)
                            process.stdout.cursorTo(0)
                            process.stdout.write(logRequestStr.replace("$current", (k + 1).toString()))
                        }

                        process.stdout.write("\n")
                        list[i].chap = chapter.chap
                        await writeJsonList(list)
                    }
                }

                if (hasChapterNew)
                    console.log(colors.blue("End: ") + colors.green("There's a new chapter"))
                else
                    console.log(colors.blue("End: ") + colors.gray("No new chapters yet"))
            } else {
                console.error(colors.blue("Status: ") + colors.red("Error request list chapter"))
            }
        }

        console.log("")
    }
}

interface ItemList {
    title: string
    url: string
    chap: number
    ignore?: boolean
}

const baseURL = "https://www.nettruyenup.com/truyen-tranh"
const defaultList: Array<ItemList> = [
    { title: "Vì Sợ Đau Nên Em Tăng Max VIT", url: "vi-so-dau-nen-em-tang-max-vit-193640", chap: 24 },
    { title: "Tôi Đã Chuyển Sinh Thành Slime", url: "toi-da-chuyen-sinh-thanh-slime-100620", chap: 102 },
    { title: "Nguyệt Đạo Dị Giới", url: "tsuki-ga-michibiku-isekai-douchuu-107050", chap: 79 },
    { title: "Sự Trỗi Dậy Của Anh Hùng Khiên", url: "su-troi-day-cua-anh-hung-khien-42150", chap: 91 },
    { title: "Mairimashita! Iruma-Kun", url: "mairimashita-iruma-kun-159850", chap: 279 },
    { title: "Tái Sinh Thành Nhện", url: "tai-sinh-thanh-nhen-116580", chap: 122 },
    { title: "Dạo Quanh Ma Quốc", url: "dao-quanh-ma-quoc-161920", chap: 48 },
    { title: "Tôi Là Nhện Đấy Thì Sao Nào?", url: "toi-la-nhen-day-thi-sao-nao-cuoc-song-cua-4-chi-em-nhen-391770", chap: 12 },
    { title: "Rồng Thần 5000 Năm Tuổi Ăn Chay", url: "weak-5000-year-old-vegan-dragon-183010", chap: 23 },
    { title: "Cuộc Sống Trả Ơn Của Nàng Rồng Tohru", url: "cuoc-song-tra-on-cua-nang-rong-tohru-101240", chap: 125 },
    { title: "Cô Nàng Siêu Gấu", url: "kuma-kuma-kuma-bear-183720", chap: 64 },
    { title: "Đảo Hải Tặc", url: "dao-hai-tac-91690", chap: 0, ignore: true },
    { title: "DR.Stone - Hồi Sinh Thế Giới", url: "drstone-hoi-sinh-the-gioi-158523", chap: 0, ignore: true },
    { title: "Ma Vương Xương", url: "gaikotsu-kishi-sama-tadaima-isekai-e-o-dekake-ch-161440", chap: 52 },
    { title: "Chuyển Sinh Thành Kiếm", url: "chuyen-sinh-thanh-kiem-152770", chap: 58 },
    { title: "Hiệu Thuốc Dị Giới", url: "isekai-yakkyoku-153320", chap: 0 },
    { title: "Tao Muốn Trở Thành Chúa Tể Bóng Tối", url: "tao-muon-tro-thanh-chua-te-bong-toi-207081", chap: 0 },
    { title: "Khám Phá Thế Giới Game", url: "kham-pha-the-gioi-game-7010", chap: 0 }
]

let listRead: Array<ItemList>

try {
    listRead = JSON.parse(fs
        .readFileSync(fileListPath).toString())
} catch (e) {
    listRead = defaultList
}

requestList(listRead)

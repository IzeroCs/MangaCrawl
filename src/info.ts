import fs from "fs"
import path from "path"
import utils from "./utils"
import bufferType from "./buffer-type"
import cloudscraper from "cloudscraper"
import yaml from "yaml"
import xmlbuilder from "xmlbuilder"
import { ItemList } from "./list"
import { ChapterEntry, Comic, Extension } from './extenstion';

const DATA_SERIALIZATION = yaml

export default class Info {
    private static fileListPath = path.resolve(__dirname, "..", "list.yaml")
    private static fileListLockPath = path.resolve(__dirname, "..", "list-lock.yaml")

    static writeCover(extension: Extension, comic: Comic): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (typeof comic.thumb === "undefined")
                resolve(true)

            cloudscraper({
                uri: comic.thumb,
                method: "GET",
                encoding: null,
                headers: {
                    "Referer": extension.httpReferer
                }
            }).then(async fill => {
                const type = bufferType(fill)
                const filepath = path.join(utils
                    .storageExtensionPath(extension, comic), "cover" + (type?.extension || ".jpg"))

                fs.writeFileSync(filepath, fill)
                resolve(true)
            }).catch(err => reject(err))
        })
    }

    static writeDetail(extension: Extension, comic: Comic): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const filepath = path.join(utils.storageExtensionPath(extension, comic), "details.json")
            const detail = {
                title: comic.title,
                author: comic.author,
                artist: comic.author,
                description: comic.description,
                genre: comic.genre.join(", "),
                status: comic.status
            }

            if (!utils.storageMaker(extension, comic))
                reject(new Error("Storage maker failed: " + utils.storageExtensionPath(extension, comic)))

            try {
                fs.writeFileSync(filepath, JSON.stringify(detail, null, 2))
                resolve(true)
            } catch (e) {
                reject(new Error("Write detail failed: " + filepath))
            }
        })
    }

    static writeComicInfo(extension: Extension, comic: Comic, chapter: ChapterEntry): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const filepath = path.join(utils.storageChapPath(extension, comic, chapter), "ComicInfo.xml")
            const xml = xmlbuilder.create("ComicInfo")
                .ele({
                    Series: "",
                    Number: chapter.chap,
                    Writer: comic.writer,
                    Penciller: comic.penciller,
                    Inker: comic.inker,
                    Title: utils.chapName(chapter),
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

    static writeListLock(list: Array<ItemList>): Promise<Boolean> {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.fileListLockPath,
                DATA_SERIALIZATION.stringify(list, null, 2), () => resolve(true))
        })
    }

    static readList(): Array<ItemList> {
        let listRead: Array<ItemList>

        try {
            listRead = DATA_SERIALIZATION.parse(fs
                .readFileSync(this.fileListLockPath).toString())
        } catch (e) {
            listRead = DATA_SERIALIZATION.parse(fs
                .readFileSync(this.fileListPath).toString())
        }

        return listRead
    }
}

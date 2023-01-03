import fs from "fs"
import path from "path"
import utils from "./utils"
import cloudscraper from "cloudscraper"
import {
    Comic,
    Extension,
    ImageEntry,
    ChapterEntry,
    RegexDestructured
} from "./extenstion"
import { AxiosResponse } from "axios"

export default class ChapterImages {
    static listImageRequest(extension: Extension, comic: Comic,
        chapter: ChapterEntry): Promise<Array<ImageEntry>>
    {
        return new Promise(async (resolve, reject) => {
            cloudscraper({
                method: "GET",
                url: chapter.uri
            }).then((source: string) => {
                source = source.replace(/[\r\n]+/g," ")
                            .replace(/[']+/g, "\"")

                const list = RegexDestructured.valueOf(source, extension.imageListRegex())
                    extension.onImageListMatch(comic, chapter, list)

                const images = RegexDestructured.imageForEachRegex(list, extension.imageEntryRegex())
                    extension.onImageEntryMatch(comic, chapter, images)

                if (typeof images.length === "undefined" || images.length <= 0)
                    reject(new Error("Not found list image in chapter: " + chapter.uri))
                else if (!utils.storageChapMaker(comic, chapter))
                    reject(new Error("Storage maker chap failed: " + chapter.chap))
                else
                    resolve(images)
            }).catch((err: Error) => console.error(err))
        })
    }

    static downloadImage(extension: Extension, comic: Comic, chapter: ChapterEntry,
        image: ImageEntry): Promise<boolean>
    {
        return new Promise((resolve, reject) => {
            comic.http.get(image.original, { responseType: "stream" })
                .then(async res => resolve(await this.writeImage(extension,
                    comic, chapter, image.original, image, res)))
                .catch(err => reject(err))
        })
    }

    static writeImage(extension: Extension, comic: Comic, chapter: ChapterEntry,
        url: string, image: ImageEntry, res: AxiosResponse): Promise<boolean>
    {
        return new Promise((resolve, reject) => {
            const formatRegex = /\/.+?(.jpg|.jpeg|.png|.bmp|.webp).*?$/gi
            const [, format ] = formatRegex.exec(url) || ["", ""]
            let num = image.page.toString();

            if (num.length <= 1)
                num = `00${num}`
            else if (num.length <= 2)
                num = `0${num}`

            const filepath = path.join(utils.storageChapPath(comic, chapter), num + format)

            res.data.pipe(fs.createWriteStream(filepath))
                .on("error", () => reject(new Error("Write image failed: " + filepath)))
                .once("close", async () => {
                    await extension.onImageEntryProcess(filepath)
                    resolve(true)
                })
        })
    }

    static renumberImage(extension: Extension, comic: Comic,
        chapter: ChapterEntry): Promise<boolean>
    {
        return new Promise((resolve, reject) => {
            const dirpath = utils.storageChapPath(comic, chapter)

            extension.onRenumberImageProcess(dirpath)
            resolve(true)
        })
    }

}

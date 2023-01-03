import {
    Extension,
    ResultRegex,
    ChapterResultRegex,
    ImageResultRegex,
    ComicStatus,
    ChapterEntry,
    Comic,
    ImageEntry
} from "./extenstion"

import jimp from "jimp"
import path from "path"
import fs from "fs"

const AUTHOR_STATUS_UPDATING = "Đang cập nhật"
const COMIC_STATUS_COMPLETED = "Hoàn thành"
const COMIC_STATUS_ONGOING = "Đang tiến hành"

const IMAGE_BLOCKS = [
    "CREDIT-NHOM-DICH-TRUYENVN-GG.jpg",
    "CREDIT-TRUYENVN-FROM-SEPT.jpg",
    "CREDIT-NHOM-DICH-LAO-MIEU-TRUYENVN-GG.jpg",
    "theo-doi.jpg"
]

export default class TruyenVnHot extends Extension {
    httpBaseUrl: string = "https://truyenvnhot.net"
    httpReferer: string = "https://truyenvnhot.net"

    chapterTitleRegex(): ResultRegex {
        return /<h1 class="name font-15x font-bold">(.+?)<\/h1>/g }

    chapterThumbRegex(): ResultRegex {
        return /<div class="book shadow rounded mx-auto">.+?src="(.+?)".+?<\/div>/g }

    chapterInfoRegex(): ResultRegex {
        return /<div class="meta-data mb-3">(.+?)<div class="actions/g }

    chapterListRegex(): ResultRegex {
        return /<section id="chapterList">.+?border">(.+?)<\/div>\s+<\/section>/g }

    infoAuthorRegex(): ResultRegex {
        return /<div class="author mb-3">.+?href=".+?">(.+?)<\/a>/g }

    infoStatusRegex(): ResultRegex {
        return /<div class="status mb-3">.+?<\/span>\s*(.+?)<\/div>/g }

    infoKindListRegex(): ResultRegex {
        return /<div class="genre mb-3">(.+?)<\/div>/g }

    infoDescriptionRegex(): ResultRegex {
        return /<div class="comic-description lh-16 long-desc">.+?">\s*(.+?)\s*<\/div>/g }

    infoSeoUrlRegex(): ResultRegex {
        return /\/([a-zA-Z0-9\-\_\.]+)$/gi }

    genreEntryRegex(): ResultRegex {
        return /<a.+?href=.+?>(.+?)<\/a>/g }

    chapEntryRegex(): ChapterResultRegex {
        return {
            regex: /<a href="(.+?)".+?">.+?Chương (\d+)<\/span>/g,
            uriAt: 1, chapAt: 2, labelAt: -1
        }
    }

    imageListRegex(): ResultRegex {
        return /<div class="chapter-content.+?<\/a>\s*<\/div>(.+?)<div class="aligncenter">/g }

    imageEntryRegex(): ImageResultRegex {
        return {
            regex: /<img loading="lazy".+?src="(.+?)">/g,
            pageAt: -1, srcAt: 1
        }
    }

    authorReplaceRegex(): ResultRegex {
        return /<a href=.+?>(.+?)<\/a>/gi }

    isAuthorStatusUpdating(author: string): boolean {
        return author == AUTHOR_STATUS_UPDATING
    }

    imageEntryBlock(url: string): boolean {
        const filter = IMAGE_BLOCKS.filter(value => {
            return url.endsWith(value)
        }) || []

        return filter.length <= 0
    }

    static isUrlExtension(url: string): boolean {
        return url.match(/^(http|https):\/\/(www.)?truyenvnhot.net/gi) !== null
    }

    comicStatus(status: string): ComicStatus {
        if (status == COMIC_STATUS_ONGOING)
            return ComicStatus.ONGOING
        else if (status == COMIC_STATUS_COMPLETED)
            return ComicStatus.COMPLETED

        return ComicStatus.UNKNOWN
    }

    // onImageEntryProcess(filepath: string): Promise<boolean> {
    //     return new Promise(async (resolve, reject) => {
    //         const originalImage = await jimp.read(filepath)

    //         if (typeof originalImage === "undefined")
    //             reject("JIMP: Failed read image " + filepath)
    //         else if (originalImage.bitmap.height <= 2048)
    //             resolve(true)

    //         const bitmap = originalImage.bitmap
    //         const width = bitmap.width
    //         const height = bitmap.height

    //         const dirpath = path.dirname(filepath)
    //         const filename = filepath.substring(dirpath.length + 1,
    //             filepath.lastIndexOf("."))

    //         let prevY = 0
    //         let fileIndex = 0
    //         let isNextWhite = false
    //         let isHorizontalWhite = true
    //         let lastXMatchColor = 0

    //         for (let y = 0; y < height; ++y) {
    //             isNextWhite = true

    //             if (lastXMatchColor != 0 && originalImage.getPixelColor(lastXMatchColor, y) != 0xFFFFFFFF) {
    //                 isNextWhite = false
    //             } else {
    //                 for (let x = 0; x < width; ++x) {
    //                     if (originalImage.getPixelColor(x, y) != 0xFFFFFFFF) {
    //                         isNextWhite = false
    //                         lastXMatchColor = x
    //                         break
    //                     }
    //                 }
    //             }

    //             if (!isNextWhite && isHorizontalWhite) {
    //                 prevY = y
    //                 isHorizontalWhite = false
    //             } else if ((isNextWhite && !isHorizontalWhite) || y - 1 >= height) {
    //                 isHorizontalWhite = true

    //                 if (y - prevY >= 300 || height - y <= 1000) {
    //                     if (height - y <= 1000)
    //                         y = height

    //                     const pathnew = path.join(dirpath, filename + "-" + (++fileIndex) + ".jpg")
    //                     const newImage = (await jimp.read(originalImage))
    //                         .crop(0, prevY, width, y - prevY - 1)
    //                         .writeAsync(pathnew)
    //                 }
    //             }
    //         }

    //         fs.unlinkSync(filepath)
    //         resolve(true)
    //     })
    // }

    // onRenumberImageProcess(dirpath: string): Promise<boolean> {
    //     return new Promise(async (resolve, reject) => {
    //         let dirlist = fs.readdirSync(dirpath)
    //             .filter(value => value != "ComicInfo.xml")
    //         let oldlist = dirlist
    //             .filter(value => /^(\d+)(.jpg|.jpeg|.png|.bmp|.webp)$/.exec(value))

    //         if (oldlist.length > 0) {
    //             oldlist.map(value => fs.unlinkSync(path.join(dirpath, value)))
    //         } else {
    //             dirlist = dirlist.sort((a: string, b: string) => {
    //                 const splitIndexA = a.indexOf("-")
    //                 const splitIndexB = b.indexOf("-")

    //                 const endIndexA = a.lastIndexOf(".")
    //                 const endIndexB = b.lastIndexOf(".")

    //                 const firstNumberA = Number.parseInt(a.substring(0, splitIndexA))
    //                 const firstNumberB = Number.parseInt(b.substring(0, splitIndexB))

    //                 const lastNumberA = Number.parseInt(a.substring(splitIndexA + 1, endIndexA))
    //                 const lastNumberB = Number.parseInt(b.substring(splitIndexB + 1, endIndexB))

    //                 return (firstNumberA > firstNumberB ||
    //                     lastNumberA > lastNumberB) ? 1 : -1
    //             })

    //             dirlist.map((value, index) => {
    //                 const number  = (index < 10 ? "00" : "0") + (index + 1)
    //                 const oldPath = path.join(dirpath, value)
    //                 const newPath = path.join(dirpath, number + ".jpg")

    //                 fs.renameSync(oldPath, newPath)
    //             })
    //         }

    //         resolve(true)
    //     })
    // }
}

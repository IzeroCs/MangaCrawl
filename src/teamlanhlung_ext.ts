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
import utils from "./utils"
import CryptoJs, { enc } from "crypto-js"

const AUTHOR_STATUS_UPDATING = "Đang cập nhật"
const COMIC_STATUS_COMPLETED = "Hoàn thành"
const COMIC_STATUS_ONGOING = "Đang tiến hành"

export default class TeamLanhLungExt extends Extension {
    httpBaseUrl: string = "https://teamlanhlung.com"
    httpReferer: string = "https://teamlanhlung.com"
    directoryStorage: string = "teamlanhlung"

    chapterTitleRegex(): ResultRegex {
        return /<h2 class="info-title".+?>(.+?)<\/h2>/g }

    titleReplace(title: string): string {
        return utils.ucfirst(title)
    }

    chapterThumbRegex(): ResultRegex {
        return /<img class="?img-thumbnail"?\s*src="?(.+?)"?\s*alt/g }

    chapterInfoRegex(): ResultRegex {
        return /<div class="col-md-7 comic-info">.+?<p>(.+?)<\/div>/g }

    chapterListRegex(): ResultRegex {
        return /<table class="table table-striped">.+?<tbody>(.+?)<\/tbody>/g }

    infoAuthorRegex(): ResultRegex {
        return /<strong>Tác giả:<\/strong>.+?<span>(.+?)<\/span>/g }

    infoStatusRegex(): ResultRegex {
        return /<span class="?comic-stt"?>(.+?)<\/span>/g }

    infoGenreListRegex(): ResultRegex {
        return /<div class="?tags.+?>(.+?)$/g }

    infoDescriptionRegex(): ResultRegex {
        return /<div class="?follow-container"?>.+?<div class="?text-justify"?>(.+?)<\/div>/g }

    infoSeoUrlRegex(): ResultRegex {
        return /\/([a-zA-Z0-9\-\_\.]+)\/?$/gi }

    genreEntryRegex(): ResultRegex {
        return /<a href=.+?>(.+?)<\/a>/g }

    genreListReplace(genres: string[]): string[] {
        for (let i = 0; i < genres.length; ++i)
            genres[i] = utils.ucfirst(genres[i])

        return genres
    }

    chapEntryRegex(): ChapterResultRegex {
        return {
            regex: /<tr>.+?<a.+?href="?(.+?)"?>.+?<span.+?>.+?CHAP\s+([0-9.]+)<\/span>/gi,
            uriAt: 1, chapAt: 2, labelAt: -1
        }
    }

    imageListRegex(): ResultRegex {
        return /<div id="?view-chapter"?.+?>(.+?)<\/div>/g }

    imageListDecrypt(source: string, list: string): string {
        let [, passphrase] = /var chapterHTML=CryptoJSAesDecrypt\((.+?),htmlContent\);/gi.exec(source) || ""
        let [, content] = /htmlContent="(.+?)";<\/script>/gi.exec(list) || ""

        if (typeof passphrase !== "undefined" && typeof content !== "undefined") {
            passphrase = passphrase.replace(/(\"\+\")/g, "")
                .replace(/(\")/g, "")

            content = content.replace(/(\\")+/g, "\"")
                .replace(/\\\\/g, "")

            const jsonObject = JSON.parse(content)
            const encrypted = jsonObject.ciphertext
            const salt = CryptoJs.enc.Hex.parse(jsonObject.salt)
            const iv = CryptoJs.enc.Hex.parse(jsonObject.iv)

            const key = CryptoJs.PBKDF2(passphrase, salt, {
                hasher: CryptoJs.algo.SHA512,
                keySize: 64/8,
                iterations: 999
            })

            return CryptoJs.AES.decrypt(encrypted, key, { iv: iv })
                .toString(CryptoJs.enc.Utf8)
        }

        return list
    }

    imageEntryRegex(): ImageResultRegex {
        return {
            regex: /<img src="?(.+?)"?\s*alt/g,
            pageAt: -1, srcAt: 1
        }
    }

    imageEntryFilter(url: string): boolean {
        return url.indexOf("data:image/") == -1
    }

    imageEntryAllow(url: string): boolean {
        return url.indexOf("data:image/") == -1
    }

    isAuthorStatusUpdating(author: string): boolean {
        return author == AUTHOR_STATUS_UPDATING
    }

    static isUrlExtension(url: string): boolean {
        return url.match(/^(http|https)\:\/\/(www.)?teamlanhlung.com/gi) !== null
    }

    comicStatus(status: string): ComicStatus {
        if (status == COMIC_STATUS_ONGOING)
            return ComicStatus.ONGOING
        else if (status == COMIC_STATUS_COMPLETED)
            return ComicStatus.COMPLETED

        return ComicStatus.UNKNOWN
    }
}

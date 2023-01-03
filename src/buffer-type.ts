export interface ResultType {
    type: string
    extension: string,
    size: number
    width: number
    height: number

    png?: {
        bit: number
        color: number
        compression: number
        filter: number
        interlace: number
    }
}

function gif(buf: Buffer): ResultType | undefined {
    if (buf.length < 13 ||
        buf[0] !== 0x47 || buf[1] !== 0x49 || buf[2] !== 0x46 ||
        buf[3] !== 0x38 || (buf[4] !== 0x39 && buf[4] !== 0x37) || buf[5] !== 0x61) {

        return
    }

    const width = buf.readUInt16LE(6)
    const height = buf.readUInt16LE(8)

    return {
        type: "image/gif",
        extension: ".gif",
        size: 0,
        width: width,
        height: height,
    }
}

function png(buf: Buffer): ResultType | undefined {
    if (buf.length < 16 ||
        buf[0] !== 0x89 ||
        buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47 ||
        buf[4] !== 0x0D || buf[5] !== 0x0A ||
        buf[6] !== 0x1A || buf[7] !== 0x0A)
    {
        return
    }

    const length = buf.readUInt32BE(8)
    const chunkData = buf.subarray(16, 16 + length)

    const width = chunkData.readUInt32BE(0)
    const height = chunkData.readUInt32BE(4)

    return {
        type: "image/png",
        extension: ".png",
        size: 0,
        width: width,
        height: height,
        png: {
            bit: chunkData.readUInt8(8),
            color: chunkData.readUInt8(9),
            compression: chunkData.readUInt8(10),
            filter: chunkData.readUInt8(11),
            interlace: chunkData.readUInt8(12)
        }
    }
}

function jpeg(buf: Buffer): ResultType | undefined {
    if (buf.length < 20 ||
        buf[0] !== 0xff || buf[1] !== 0xd8 ||
        buf[2] !== 0xff || buf[3] !== 0xe0 ||
        buf.readUInt16BE(4) !== 16 ||
        buf[6] !== 0x4a || buf[7] !== 0x46 || buf[8] !== 0x49 || buf[9] !== 0x46 || buf[10] !== 0 ||
        buf[20] !== 0xff || buf[21] !== 0xdb) {

        return
    }

    let offset = 20
    let sof0 = null

    while (offset < buf.length) {
        const flag = buf.slice(offset, offset + 2)
        const size = buf.readUInt16BE(offset + 2)

        if (flag[0] === 0xff && flag[1] === 0xc0) {
            sof0 = offset
            break
        }
        offset += 2 + size
    }

    const result: ResultType = {
        type: "image/jpeg",
        extension: ".jpg",
        size: 0,
        width: 0,
        height: 0
    }

    if (sof0) {
        offset = sof0 + 2 + 2 + 1
        result.height = buf.readUInt16BE(offset)
        result.width = buf.readUInt16BE(offset + 2)
    }

    return result
}

function jpegExif(buf: Buffer): ResultType | undefined {
    if (buf.length < 4 ||
        buf[0] !== 0xff || buf[1] !== 0xd8 ||
        buf[2] !== 0xff || buf[3] !== 0xe1)
    {
        return
    }

    let offset = 2
    let sof0 = null

    while (offset < buf.length) {
        const flag = buf.subarray(offset, offset + 2)
        const size = buf.readUInt16BE(offset + 2)

        if (flag[0] === 0xff && flag[1] === 0xc0) {
            sof0 = offset
            break
        }

        offset += 2 + size
    }

    const result: ResultType = {
        type: "image/jpeg",
        extension: ".jpg",
        size: 0,
        width: 0,
        height: 0
    }

    if (sof0) {
        offset = sof0 + 2 + 2 + 1
        result.height = buf.readUInt16BE(offset)
        result.width = buf.readUInt16BE(offset + 2)
    }

      return result
}

function bmp(buf: Buffer): ResultType | undefined {
    if (buf.length < 36 || buf[0] !== 0x42 || buf[1] !== 0x4d)
        return

    const headerSize = buf.readUInt32LE(14)
    const header = buf.subarray(18, 18 + headerSize - 4)
    let width, height

    if (headerSize === 12) {
        width = header.readUInt16LE(0)
        height = header.readUInt16LE(2)
    } else {
        width = header.readUInt32LE(0)
        height = header.readUInt32LE(4)
    }

    return {
        type: "image/bmp",
        extension: ".bmp",
        size: 0,
        width: width,
        height: height,
    }
}

function webp(buf: Buffer): ResultType | undefined {
    if (buf.length < 12)
        return

    if (buf.subarray(0, 4).toString() !== 'RIFF' || buf.subarray(8, 12).toString() !== 'WEBP')
        return

    const size = buf.readUInt32LE(4)

    return {
        type: "image/webp",
        extension: ".webp",
        size: size + 8,
        width: 0,
        height: 0
    }
}

const types = [
    gif, png, jpeg,
    jpegExif, bmp, webp
]

export default function detect(buf: Buffer) {
  if (!buf || !buf.length)
    return

    for (let i = 0; i < types.length; i++) {
        const result = types[i](buf)

        if (result)
            return result
    }
}

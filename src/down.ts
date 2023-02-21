import axios from "axios"
import path from "path"
import fs from "fs"

let startBytes = 0
let endBytes = 0
let totalBytes = 717589012
let url = "https://vd422.mycdn.me/?expires=1677076426857&srcIp=118.69.149.83&pr=10" +
  "&srcAg=CHROME&ms=45.136.21.25&type=2&sig=W7gBqR7YhOA&ct=4" +
  "&urls=45.136.20.65&clientType=0&id=369734650566&bytes=${start}-${end}"
let stream = fs.createWriteStream(path.resolve(__dirname, "..", "output.mp4"), {
  autoClose: true,
  encoding: undefined,
  fd: undefined
})

let log = "Progress: ${percent}%"

function nextChunk(): Promise<any> {
  return new Promise((resolve, reject) => {
    endBytes += 1553484

    if (endBytes >= totalBytes)
      endBytes = totalBytes

    axios({
      url: url.replace("${start}", startBytes.toString())
        .replace("${end}", endBytes.toString()),
      responseType: "arraybuffer",
      headers: {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Referer": "https://ok.ru/video/645387324070",
        "Origin": "https://ok.ru",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.50"
      }
    }).then(fill => {
      process.stdout.clearLine(0)
      process.stdout.cursorTo(0)
      process.stdout.write(log.replace("${percent}",
        Math.ceil(endBytes / totalBytes * 100).toString()))
      startBytes = endBytes + 1
      stream.write(fill.data)
      return endBytes >= totalBytes ? Promise.resolve(true) : nextChunk()
    })
  })
}

process.stdout.write(log.replace("${percent}", "0"))
nextChunk()
  .then(res => console.log("End", res))
  .catch(err => console.error("Err", err))

"use strict"

const http = require("http")
const fs = require("fs")
const url = require("url")
const sqlite = require("sqlite3").verbose()

let db = new sqlite.Database(":memory:")

const resetDB = () => {
    return new Promise((resolve, reject) => {
        db.close()
        db = new sqlite.Database(":memory:")

        db.serialize(() => {

            db.run("CREATE TABLE TestTable (data TEXT)")

            const statement = db.prepare("INSERT INTO TestTable VALUES (?)")

            for (let i=1; i<=10; i++) {
                statement.run(`Stuff ${i}`)
            }

            statement.finalize()

            resolve()
        })
    })
}

const getDBData = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT rowid AS id, data FROM TestTable", (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

const addSafe = input => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO TestTable VALUES (?)`, input, err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

const addUnsafe = input => {
    return new Promise((resolve, reject) => {

        //db.run(`INSERT INTO TestTable VALUES ('${input}')`)
        db.run("INSERT INTO TestTable VALUES ('" + input + "')") // <--- CL zéro safe!!!!

        resolve()
    })
}

const deleteSafe = input => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM TestTable WHERE rowid=?", input, err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

const deleteUnsafe = input => {
    return new Promise((resolve, reject) => {
        //db.run(`DELETE FROM TestTable WHERE rowid=${input}`)
        db.run(`DELETE FROM TestTable WHERE rowid=` + input)// <--- CL zéro safe!!!!
        resolve()
    })
}

http.createServer((request, response) => {

    let path = url.parse(request.url).pathname
    let rows = []
    let jsonData = ""

    path = (path=="/"?"/index.html":path)

    request.on("data", chunk => jsonData += chunk)
    request.on("end", async () => {

        jsonData = jsonData.length ? JSON.parse(jsonData) : jsonData

        console.log(path, jsonData)

        try {
            switch(path){

                case "/addSafe":
                    await addSafe(jsonData.input)
                    break

                case "/addUnsafe":
                    await addUnsafe(jsonData.input)
                    break

                case "/deleteSafe":
                    await deleteSafe(jsonData.input)
                    break

                case "/deleteUnsafe":
                    await deleteUnsafe(jsonData.input)
                    break

                case "/resetDatabase":
                    await resetDB()
                    break

                default:
                    try{
                        return void response.end(fs.readFileSync(__dirname+path))
                    }catch(e){return}
            }

            rows = await getDBData()

        } catch (e) {
            console.log(`ERROR - ${e}`)
        }

        response.end(JSON.stringify({rows}))
    })

}).listen(1337, () => console.log("Server Listening on port 1337"))

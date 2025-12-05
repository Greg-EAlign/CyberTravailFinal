"use strict"

const http = require("http")
const fs = require("fs")
const path = require("path")
const url = require("url")
const sqlite = require("sqlite3").verbose()

let db = new sqlite.Database(":memory:")

const runAll = sql => new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
        if (err) {
            reject(err)
        } else {
            resolve(rows)
        }
    })
})

const runGet = sql => new Promise((resolve, reject) => {
    db.get(sql, (err, row) => {
        if (err) {
            reject(err)
        } else {
            resolve(row)
        }
    })
})

const runExecute = sql => new Promise((resolve, reject) => {
    db.run(sql, err => {
        if (err) {
            reject(err)
        } else {
            resolve()
        }
    })
})

const seedDatabase = () => {
    return new Promise((resolve, reject) => {
        db.close(err => {
            if (err) {
                reject(err)
                return
            }

            db = new sqlite.Database(":memory:")

            db.serialize(() => {
                db.run("CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT)")
                db.run("CREATE TABLE Products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, price REAL, stock INTEGER)")
                db.run("CREATE TABLE Orders (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, productId INTEGER, quantity INTEGER, total REAL)")

                const insertUser = db.prepare("INSERT INTO Users (username, password, role) VALUES (?, ?, ?)")
                const users = [
                    ["admin", "supersecure", "admin"],
                    ["alice", "wonderland", "customer"],
                    ["bob", "builder", "customer"]
                ]
                users.forEach(user => insertUser.run(user))
                insertUser.finalize()

                const insertProduct = db.prepare("INSERT INTO Products (name, description, price, stock) VALUES (?, ?, ?, ?)")
                const products = [
                    ["Cyber Hoodie", "Sweat à capuche édition limitée", 79.99, 25],
                    ["USB Rubber Ducky", "Outil de test d'intrusion", 54.5, 12],
                    ["RFID Shield Wallet", "Portefeuille anti-RFID", 29.9, 40],
                    ["Lockpick Set", "Kit de crochetage pour pentester", 39.0, 18]
                ]
                products.forEach(product => insertProduct.run(product))
                insertProduct.finalize()

                const insertOrder = db.prepare("INSERT INTO Orders (userId, productId, quantity, total) VALUES (?, ?, ?, ?)")
                const orders = [
                    [2, 1, 1, 79.99],
                    [3, 2, 2, 109.0]
                ]
                orders.forEach(order => insertOrder.run(order))
                insertOrder.finalize(errFinalize => {
                    if (errFinalize) {
                        reject(errFinalize)
                    } else {
                        resolve()
                    }
                })
            })
        })
    })
}

const getState = async () => {
    const [products, orders, users] = await Promise.all([
        runAll("SELECT id, name, description, price, stock FROM Products ORDER BY id"),
        runAll("SELECT id, userId, productId, quantity, total FROM Orders ORDER BY id"),
        runAll("SELECT id, username, password, role FROM Users ORDER BY id")
    ])
    return {products, orders, users}
}

const login = async ({username = "", password = ""}) => {
    const sql = "SELECT id, username, password, role FROM Users WHERE username='" + username + "' AND password='" + password + "'"
    console.log("[login/unsafe]", sql)
    return runGet(sql)
}

const searchProducts = async ({query = ""}) => {
    const sql = "SELECT id, name, description, price, stock FROM Products WHERE name LIKE '%" + query + "%' OR description LIKE '%" + query + "%'"
    console.log("[searchProducts/unsafe]", sql)
    return runAll(sql)
}

const updatePrice = async ({productId = "", newPrice = ""}) => {
    const sql = "UPDATE Products SET price=" + newPrice + " WHERE id=" + productId
    console.log("[updatePrice/unsafe]", sql)
    await runExecute(sql)
    return runGet("SELECT id, name, price FROM Products WHERE id=" + productId)
}

const placeOrder = async ({userId = "", productId = "", quantity = ""}) => {
    const sql = "INSERT INTO Orders (userId, productId, quantity, total) VALUES (" + userId + ", " + productId + ", " + quantity + ", (SELECT price * " + quantity + " FROM Products WHERE id=" + productId + "))"
    console.log("[placeOrder/unsafe]", sql)
    await runExecute(sql)
    return runAll("SELECT * FROM Orders ORDER BY id DESC LIMIT 1")
}

const handlers = {
    "/api/login": login,
    "/api/searchProducts": searchProducts,
    "/api/updatePrice": updatePrice,
    "/api/placeOrder": placeOrder
}

const server = http.createServer((request, response) => {
    const {pathname} = url.parse(request.url)
    const resolvedPath = pathname === "/" ? "/index.html" : pathname

    if (!resolvedPath.startsWith("/api")) {
        const filePath = path.join(__dirname, resolvedPath)
        fs.readFile(filePath, (err, data) => {
            if (err) {
                response.writeHead(404)
                response.end("Not found")
            } else {
                response.writeHead(200)
                response.end(data)
            }
        })
        return
    }

    let jsonData = ""
    request.on("data", chunk => {
        jsonData += chunk
    })

    request.on("end", async () => {
        const body = jsonData.length ? JSON.parse(jsonData) : {}
        let actionResult = null
        let error = null

        try {
            switch (resolvedPath) {
                case "/api/reset":
                    await seedDatabase()
                    break
                case "/api/state":
                    break
                default:
                    if (handlers[resolvedPath]) {
                        actionResult = await handlers[resolvedPath](body)
                    } else {
                        response.writeHead(404)
                        response.end(JSON.stringify({error: "Unknown endpoint"}))
                        return
                    }
            }
        } catch (err) {
            console.log("[error/unsafe]", err)
            error = err.message || "Unexpected error"
        }

        try {
            const state = await getState()
            response.writeHead(200, {"Content-Type": "application/json"})
            response.end(JSON.stringify({state, actionResult, error}))
        } catch (stateErr) {
            response.writeHead(500, {"Content-Type": "application/json"})
            response.end(JSON.stringify({error: stateErr.message || "State fetch failed"}))
        }
    })
})

seedDatabase().then(() => {
    server.listen(1337, () => console.log("Server Listening on port 1337"))
})

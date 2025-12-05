"use strict"

const http = require("http")
const fs = require("fs")
const path = require("path")
const url = require("url")
const sqlite = require("sqlite3").verbose()

let db = new sqlite.Database(":memory:")

const runAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) {
            reject(err)
        } else {
            resolve(rows)
        }
    })
})

const runGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) {
            reject(err)
        } else {
            resolve(row)
        }
    })
})

const runExecute = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, err => {
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
    const sql = "SELECT id, username, role FROM Users WHERE username=? AND password=?"
    console.log("[login]", sql, username)
    return runGet(sql, [username, password])
}

const searchProducts = async ({query = ""}) => {
    const sql = "SELECT id, name, description, price, stock FROM Products WHERE name LIKE ? OR description LIKE ?"
    console.log("[searchProducts]", sql, query)
    const like = `%${query}%`
    return runAll(sql, [like, like])
}

const updatePrice = async ({productId, newPrice}) => {
    const idNumber = Number(productId)
    const priceNumber = Number(newPrice)
    if (!Number.isFinite(idNumber) || !Number.isFinite(priceNumber)) {
        throw new Error("Paramètres invalides pour updatePrice")
    }
    const sql = "UPDATE Products SET price=? WHERE id=?"
    console.log("[updatePrice]", sql, idNumber)
    await runExecute(sql, [priceNumber, idNumber])
    return runGet("SELECT id, name, price FROM Products WHERE id=?", [idNumber])
}

const placeOrder = async ({userId, productId, quantity}) => {
    const userNumber = Number(userId)
    const productNumber = Number(productId)
    const quantityNumber = Number(quantity)
    if (!Number.isInteger(userNumber) || !Number.isInteger(productNumber) || !Number.isFinite(quantityNumber) || quantityNumber <= 0) {
        throw new Error("Paramètres invalides pour placeOrder")
    }
    const priceRow = await runGet("SELECT price FROM Products WHERE id=?", [productNumber])
    if (!priceRow) {
        return null
    }
    const total = priceRow.price * quantityNumber
    const sql = "INSERT INTO Orders (userId, productId, quantity, total) VALUES (?, ?, ?, ?)"
    console.log("[placeOrder]", sql, productNumber)
    await runExecute(sql, [userNumber, productNumber, quantityNumber, total])
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
            console.log("[error]", err)
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
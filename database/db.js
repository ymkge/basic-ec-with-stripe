const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Promiseベースのラッパー関数
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Error running sql: ' + sql);
                console.error(err);
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) {
                console.error('Error running sql: ' + sql);
                console.error(err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error running sql: ' + sql);
                console.error(err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// トランザクション用の関数
async function runTransaction(callback) {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                await run('BEGIN TRANSACTION');
                await callback();
                await run('COMMIT');
                resolve();
            } catch (err) {
                console.error('Transaction failed, rolling back.', err);
                await run('ROLLBACK');
                reject(err);
            }
        });
    });
}


module.exports = {
    db,
    run,
    get,
    all,
    runTransaction
};

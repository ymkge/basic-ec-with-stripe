const { run, all } = require('./db.js');

// server.jsから持ってきた初期データ
const initialProducts = [
    {
        id: 'prod_1',
        name: 'どこでもいっしょ トロ型スーパーDXクッション',
        price: 77777,
        description: 'トロと一緒にゴロゴロできるにゃよ。',
        image: 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/dr000/auc0510/user/07d62384d85995730e8b311ce39b86e218a6d44a24c13ed68569a0235265c74d/i-img1200x1200-17285735876204nsylhf43675.jpg',
        stock: 10
    },
    {
        id: 'prod_2',
        name: 'どこでもいっしょクロTシャツ',
        price: 3777,
        description: 'どこでもクロと一緒にゃよ。',
        image: 'https://www.cospa.com/images/items/pc/107228.jpg',
        stock: 5
    },
    {
        id: 'prod_3',
        name: 'ピーエル フィギアマスコット',
        price: 3777,
        description: 'まちおぼうけ中だワン',
        image: 'https://m.media-amazon.com/images/I/51JOe+ClUpL._AC_UF894,1000_QL80_.jpg',
        stock: 8
    }
];

async function initializeDatabase() {
    // テーブル作成
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            description TEXT,
            image TEXT,
            stock INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await run(createTableSql);
    console.log('Products table created or already exists.');

    // updated_atを自動更新するトリガーを作成
    const createTriggerSql = `
        CREATE TRIGGER IF NOT EXISTS update_products_updated_at
        AFTER UPDATE ON products
        FOR EACH ROW
        BEGIN
            UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;
    `;
    await run(createTriggerSql);
    console.log('Update trigger for products created or already exists.');

    // 初期データの投入
    const products = await all('SELECT * FROM products');
    if (products.length === 0) {
        console.log('No products found, inserting initial data...');
        const insertSql = `
            INSERT INTO products (id, name, price, description, image, stock)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        for (const product of initialProducts) {
            await run(insertSql, [
                product.id,
                product.name,
                product.price,
                product.description,
                product.image,
                product.stock
            ]);
        }
        console.log('Initial product data inserted.');
    } else {
        console.log('Database already contains product data.');
    }
}

module.exports = { initializeDatabase };

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const { initializeDatabase } = require('./database/init');
const db = require('./database/db');

const app = express();

// Stripe Webhook用のエンドポイント
// 重要: express.json() の前にこのルートを定義する必要があります。
// なぜなら、Stripeは署名検証のためにrawリクエストボディを必要とするからです。
app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
    const sig = request.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return response.sendStatus(400);
    }

    // イベントタイプに応じて処理を分岐
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const cart = JSON.parse(session.metadata.cart);

            console.log('決済が成功しました。在庫を更新します。');
            console.log('購入された商品:', cart);

            try {
                // トランザクション内で在庫更新処理を実行
                await db.runTransaction(async () => {
                    for (const item of cart) {
                        const product = await db.get('SELECT * FROM products WHERE id = ?', [item.id]);
                        if (product) {
                            const newStock = product.stock - item.quantity;
                            await db.run(
                                'UPDATE products SET stock = ? WHERE id = ?',
                                [Math.max(0, newStock), item.id]
                            );
                            console.log(`商品: ${product.name}, 新しい在庫: ${Math.max(0, newStock)}`);
                        }
                    }
                });
                console.log('在庫更新が正常に完了しました。');
            } catch (err) {
                console.error('在庫更新中にエラーが発生しました:', err);
                // ここで管理者に通知するなどのエラー処理を追加することが望ましい
            }
            
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    response.json({received: true});
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 商品リストを取得するAPI
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.all('SELECT * FROM products ORDER BY created_at ASC');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products from database' });
    }
});

// Stripe Checkoutセッションを作成するAPI
app.post('/create-checkout-session', async (req, res) => {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty or invalid' });
    }

    try {
        // 在庫チェックとline_itemsの作成を一つのループで行う
        const line_items = [];
        for (const item of cart) {
            const product = await db.get('SELECT * FROM products WHERE id = ?', [item.id]);
            if (!product) {
                return res.status(404).json({ error: `商品が見つかりません: ${item.id}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `在庫が不足しています。`,
                    productName: product.name,
                    stock: product.stock 
                });
            }
            line_items.push({
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: product.name,
                        images: [product.image],
                    },
                    unit_amount: product.price,
                },
                quantity: item.quantity,
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: line_items,
            mode: 'payment',
            success_url: `http://localhost:3000/success.html`,
            cancel_url: `http://localhost:3000/cancel.html`,
            metadata: {
                cart: JSON.stringify(cart.map(item => ({ id: item.id, quantity: item.quantity })))
            }
        });

        res.json({ url: session.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;

// データベースを初期化してからサーバーを起動
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
    })
    .catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });

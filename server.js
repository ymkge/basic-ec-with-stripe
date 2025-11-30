require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();

// 商品データ (サーバーサイドで管理)
const products = [
    {
        id: 'prod_1',
        name: 'どこでもいっしょ トロ型スーパーDXクッション',
        price: 77777, // 円単位
        description: 'トロと一緒にゴロゴロできるにゃよ。',
        image: 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/dr000/auc0510/user/07d62384d85995730e8b311ce39b86e218a6d44a24c13ed68569a0235265c74d/i-img1200x1200-17285735876204nsylhf43675.jpg',
        stock: 10
    },
    {
        id: 'prod_2',
        name: 'どこでもいっしょクロTシャツ',
        price: 3777, // 円単位
        description: 'どこでもクロと一緒にゃよ。',
        image: 'https://www.cospa.com/images/items/pc/107228.jpg',
        stock: 5
    },
    {
        id: 'prod_3',
        name: 'ピーエル フィギアマスコット',
        price: 3777, // 円単位
        description: 'まちおぼうけ中だワン',
        image: 'https://m.media-amazon.com/images/I/51JOe+ClUpL._AC_UF894,1000_QL80_.jpg',
        stock: 8
    }
];

// Stripe Webhook用のエンドポイント
// 重要: express.json() の前にこのルートを定義する必要があります。
// なぜなら、Stripeは署名検証のためにrawリクエストボディを必要とするからです。
app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
    const sig = request.headers['stripe-signature'];
    // このシークレットはStripeダッシュボードでWebhookエンドポイントを設定した際に取得します。
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
            
            // メタデータからカート情報を取得
            const cart = JSON.parse(session.metadata.cart);

            console.log('決済が成功しました。在庫を更新します。');
            console.log('購入された商品:', cart);

            // 在庫を減らす処理
            cart.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (product) {
                    // 在庫がマイナスにならないように念のためチェック
                    const newStock = product.stock - item.quantity;
                    product.stock = Math.max(0, newStock);
                    console.log(`商品: ${product.name}, 新しい在庫: ${product.stock}`);
                }
            });
            
            break;
        // ... 他のイベントタイプを処理する場合はここに追加
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Stripeに受信成功のレスポンスを返す
    response.json({received: true});
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 商品リストを取得するAPI
app.get('/api/products', (req, res) => {
    res.json(products);
});

// Stripe Checkoutセッションを作成するAPI
app.post('/create-checkout-session', async (req, res) => {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty or invalid' });
    }

    try {
        // 在庫チェック
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
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
        }

        const line_items = cart.map(item => {
            const product = products.find(p => p.id === item.id);
            // この時点では product は必ず見つかり、在庫も十分ある
            return {
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: product.name,
                        images: [product.image],
                    },
                    unit_amount: product.price,
                },
                quantity: item.quantity,
            };
        });

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
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

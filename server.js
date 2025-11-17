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
        image: 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/dr000/auc0510/user/07d62384d85995730e8b311ce39b86e218a6d44a24c13ed68569a0235265c74d/i-img1200x1200-17285735876204nsylhf43675.jpg'
    },
    {
        id: 'prod_2',
        name: 'どこでもいっしょクロTシャツ',
        price: 3777, // 円単位
        description: 'どこでもクロと一緒にゃよ。',
        image: 'https://www.cospa.com/images/items/pc/107228.jpg'
    }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 商品リストを取得するAPI
app.get('/api/products', (req, res) => {
    res.json(products);
});

// Stripe Checkoutセッションを作成するAPI
app.post('/create-checkout-session', async (req, res) => {
    const { productId } = req.body;

    const product = products.find(p => p.id === productId);

    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: product.name,
                            images: [product.image],
                        },
                        // 価格はセント単位で渡す (例: 3500円 -> 3500)
                        // Stripe APIの最新の挙動では、JPYの場合、セントではなく円の値をそのまま渡します。
                        unit_amount: product.price,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `http://localhost:3000/success.html`,
            cancel_url: `http://localhost:3000/cancel.html`,
        });

        res.json({ url: session.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
